import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { OnboardingCard } from "@/components/dashboard/onboarding-card"
import { Button } from "@/components/ui/button"
import { formatTime, todayInAppZone } from "@/lib/format/datetime"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import { EXECUTION_STATUS_LABELS } from "@/modules/field-execution/domain/execution"
import {
  buildDailyDecisions,
  buildHeadline,
  type DecisionTone,
} from "@/modules/platform/application/daily-decisions"
import type { OnboardingFlow } from "@/modules/platform/application/onboarding-flow"
import { listDispatchInbox, readEnRouteEta } from "@/modules/scheduling/composition"
import { getTenantCaseStats } from "@/modules/service/composition"
import type { UUID } from "@/types/shared"

const TONE_DOT: Record<DecisionTone, string> = {
  critical: "bg-red-500",
  attention: "bg-orange-500",
  positive: "bg-emerald-500",
}

/**
 * Centro de Comando — la pantalla inicial de NEXUS (rediseño founder 2026-07-01).
 *
 * No es un resumen del sistema: es un centro de atención. Cuatro piezas, nada más:
 *   1. La Frase — el titular del día ("Hoy hay N decisiones…").
 *   2. Las Decisiones — máx. 3 filas con gramática verbo+objeto+consecuencia.
 *   3. La Línea de Pulso — una línea de prosa que responde "¿está sana?".
 *   4. Ahora en Campo — la operación viva, compacta.
 *
 * Reutiliza íntegramente las consultas existentes (cero queries/tablas nuevas);
 * la fusión y el ranking viven en `buildDailyDecisions` (puro, testeado).
 * Todo lo que un módulo ya muestra (KPIs, distribución, históricos) NO vive aquí.
 */
export async function CommandCenter({
  tenantSlug,
  tenantId,
  permissions,
  onboarding,
}: {
  tenantSlug: string
  tenantId: UUID
  permissions: readonly string[]
  onboarding: OnboardingFlow
}) {
  const can = (p: string) => hasPermission(permissions, p)
  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const base = `/app/${tenantSlug}`

  const [inbox, board, invoicesPage, stats, caseStats] = await Promise.all([
    listDispatchInbox(tenantId),
    getFieldMonitorBoard(tenantId),
    canInvoices
      ? listTenantInvoices(tenantId, {
          search: null,
          status: null,
          companyId: null,
          page: 1,
          pageSize: 1000,
        })
      : Promise.resolve(null),
    canDispatch ? getTenantDispatchStats(tenantId, todayInAppZone()) : Promise.resolve(null),
    canCases ? getTenantCaseStats(tenantId) : Promise.resolve(null),
  ])

  // ── Cobranza: total, cuántas facturas y la edad de la más antigua ──────────
  const openInvoices = (invoicesPage?.items ?? []).filter((i) => i.balance > 0.01)
  const receivable = canInvoices
    ? {
        total: openInvoices.reduce((s, i) => s + i.balance, 0),
        count: openInvoices.length,
        oldestIssueAt:
          openInvoices
            .map((i) => i.issueDate ?? i.createdAt)
            .filter(Boolean)
            .sort()[0] ?? null,
      }
    : null

  const briefing = buildDailyDecisions({
    openBreachedCount: caseStats?.openBreachedCount ?? 0,
    proposals: inbox.proposals.map((p) => ({
      caseNumber: p.caseNumber,
      subject: p.subject,
      technicianName: p.technicianName,
      scheduleLabel: p.scheduleLabel,
    })),
    exceptions: inbox.exceptions.map((e) => ({
      caseNumber: e.caseNumber,
      subject: e.subject,
    })),
    overloadedTechnicians: stats?.overloadedTechnicians ?? 0,
    receivable,
  })
  // Activación: la guía de primeros pasos solo vive en Inicio mientras la
  // operación NO arranca (pasos 1-3: clientes → técnicos → órdenes). En cuanto
  // hay órdenes, el checklist sale de la primera pantalla — hablarle de "pasos"
  // a alguien que ya opera confunde; el lazo del dinero se cierra solo desde el
  // cierre facturable del técnico.
  const activationStep =
    onboarding.status === "in_progress" && onboarding.step.stepNumber <= 3
      ? onboarding.step
      : null
  const headline = buildHeadline(briefing, { onboardingInProgress: activationStep != null })

  // ── Ahora en Campo: técnicos con un trabajo vivo + ETA real ────────────────
  const activeEntries = board.entries.filter((e) => e.activeJob)
  const etas = await Promise.all(
    activeEntries.map((e) =>
      e.activeJob!.assignmentId
        ? readEnRouteEta(tenantId, e.activeJob!.assignmentId)
        : Promise.resolve(null),
    ),
  )

  // ── La Línea de Pulso: una frase, no tarjetas ──────────────────────────────
  const pulse: string[] = []
  if (stats) {
    pulse.push(
      `${stats.availableTechnicians} ${stats.availableTechnicians === 1 ? "técnico disponible" : "técnicos disponibles"}`,
    )
  }
  pulse.push(
    `${activeEntries.length} ${activeEntries.length === 1 ? "orden en ejecución" : "órdenes en ejecución"}`,
  )
  if (caseStats?.slaCompliancePct != null) pulse.push(`SLA al ${caseStats.slaCompliancePct}%`)
  if (briefing.decisions.length > 0 && briefing.hiddenCount === 0) {
    pulse.push("nada más requiere tu atención")
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── #1 La Frase ─────────────────────────────────────────────────────── */}
      <h1 className="mx-auto mt-10 mb-12 max-w-lg text-center text-[26px] font-semibold leading-snug tracking-tight text-foreground">
        {headline}
      </h1>

      {/* ── Activación: para un tenant que aún no opera, ESTA es la decisión ── */}
      {activationStep ? (
        <div className="mb-10">
          <OnboardingCard step={activationStep} tenantSlug={tenantSlug} />
        </div>
      ) : null}

      {/* ── #2 Las Decisiones ──────────────────────────────────────────────── */}
      {briefing.decisions.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {briefing.decisions.map((d) => (
            <div key={d.id} className="flex items-center gap-4 px-1 py-4">
              <span className={`size-2 shrink-0 rounded-full ${TONE_DOT[d.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium leading-snug text-foreground">{d.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{d.detail}</p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`${base}/${d.segment}`}>{d.actionLabel}</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {briefing.hiddenCount > 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link
            href={`${base}/operations`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            {briefing.hiddenCount === 1
              ? "1 decisión más en la Estación de Supervisión"
              : `${briefing.hiddenCount} decisiones más en la Estación de Supervisión`}
            <ArrowRight className="size-3" />
          </Link>
        </p>
      ) : null}

      {/* ── #3 La Línea de Pulso ───────────────────────────────────────────── */}
      {pulse.length > 0 ? (
        <p className="mt-10 text-center text-[13px] text-muted-foreground">
          {pulse.join(" · ")}
        </p>
      ) : null}

      {/* ── #4 Ahora en Campo ──────────────────────────────────────────────── */}
      {activeEntries.length > 0 ? (
        <div className="mt-10">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Ahora en campo
          </p>
          <div className="divide-y divide-border border-t border-border">
            {activeEntries.map((e, i) => {
              const job = e.activeJob!
              const eta = etas[i]?.arrivalAt ?? null
              return (
                <Link
                  key={e.technicianId}
                  href={`${base}/work-orders/${job.workOrderId}`}
                  className="flex items-center gap-3 px-1 py-2.5 text-[13px] transition-colors hover:bg-muted/30"
                >
                  <span className="shrink-0 font-medium text-foreground">
                    {e.technicianName}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {job.workOrderNumber ? `#${job.workOrderNumber} · ` : ""}
                    {job.workOrderSubject ?? "Orden en curso"}
                    {job.companyName ? ` — ${job.companyName}` : ""}
                  </span>
                  <span className="shrink-0 text-nexus-blue">
                    {EXECUTION_STATUS_LABELS[job.executionStatus].toLowerCase()}
                    {eta ? ` · llega ${formatTime(eta)}` : ""}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
