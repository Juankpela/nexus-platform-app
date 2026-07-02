import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { OnboardingCard } from "@/components/dashboard/onboarding-card"
import { Button } from "@/components/ui/button"
import { formatTime, todayInAppZone } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
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

const TONE_STYLES: Record<DecisionTone, { chip: string; badge: string }> = {
  critical: {
    chip: "bg-red-500/10 text-red-500",
    badge: "border-red-500/30 text-red-600 dark:text-red-400",
  },
  attention: {
    chip: "bg-orange-500/10 text-orange-500",
    badge: "border-orange-500/30 text-orange-600 dark:text-orange-400",
  },
  positive: {
    chip: "bg-emerald-500/10 text-emerald-500",
    badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  },
}

const DECISION_ICONS: Record<string, LucideIcon> = {
  "sla-breached": ShieldAlert,
  proposal: Sparkles,
  exception: AlertTriangle,
  overload: Users,
  receivable: Receipt,
}

/** Tarjeta de estado: chip de ícono + etiqueta + cifra + contexto. Sin series inventadas. */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  accent: "blue" | "emerald" | "orange" | "silver"
}) {
  const styles = {
    blue: { chip: "bg-nexus-blue/10 text-nexus-blue", value: "text-foreground" },
    emerald: {
      chip: "bg-emerald-500/10 text-emerald-500",
      value: "text-emerald-600 dark:text-emerald-400",
    },
    orange: {
      chip: "bg-orange-500/10 text-orange-500",
      value: "text-orange-600 dark:text-orange-400",
    },
    silver: { chip: "bg-muted text-muted-foreground", value: "text-foreground" },
  }[accent]
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${styles.chip}`}>
          <Icon className="size-4.5" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${styles.value}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * Centro de Comando — la pantalla inicial de NEXUS (rediseño founder, 2026-07-01;
 * iteración visual con referencia NOC aprobada por el founder).
 *
 * Disciplina de datos intacta: solo entra lo que provoca una decisión.
 *   1. Cuatro tarjetas de estado (ejecución, SLA, por cobrar, decisiones).
 *   2. Panel de decisiones — La Frase como título; filas con chip, badge y acción.
 *   3. Ahora en Campo — la operación viva con ETA real.
 * Nada de series inventadas ni KPIs decorativos; los detalles viven en sus módulos.
 * Reutiliza íntegramente las consultas existentes; la fusión y el ranking viven en
 * `buildDailyDecisions` (puro, testeado).
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
  const totalDecisions = briefing.decisions.length + briefing.hiddenCount

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

  const slaPct = caseStats?.slaCompliancePct ?? null

  return (
    <div className="space-y-5">
      {/* ── Activación: para un tenant que aún no opera, ESTA es la decisión ── */}
      {activationStep ? (
        <OnboardingCard step={activationStep} tenantSlug={tenantSlug} />
      ) : null}

      {/* ── #1 Estado en cuatro cifras (solo las que cambian decisiones) ────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Órdenes en ejecución"
          value={String(activeEntries.length)}
          hint={
            stats
              ? `${stats.availableTechnicians} ${stats.availableTechnicians === 1 ? "técnico disponible" : "técnicos disponibles"}`
              : undefined
          }
          accent="blue"
        />
        <StatCard
          icon={ShieldCheck}
          label="Cumplimiento SLA"
          value={slaPct != null ? `${slaPct}%` : "—"}
          hint="casos dentro del compromiso"
          accent={slaPct == null ? "silver" : slaPct >= 90 ? "emerald" : "orange"}
        />
        {receivable ? (
          <StatCard
            icon={Wallet}
            label="Por cobrar"
            value={formatCOP(receivable.total)}
            hint={
              receivable.count > 0
                ? `${receivable.count} ${receivable.count === 1 ? "factura sin saldar" : "facturas sin saldar"}`
                : "cartera al día"
            }
            accent="silver"
          />
        ) : null}
        <StatCard
          icon={AlertTriangle}
          label="Decisiones pendientes"
          value={String(totalDecisions)}
          hint={totalDecisions > 0 ? "requieren tu acción" : "nada pendiente"}
          accent={totalDecisions > 0 ? "orange" : "emerald"}
        />
      </div>

      {/* ── #2 Decisiones + #3 Ahora en Campo ──────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Decisiones del día" className="lg:col-span-2">
          <div className="rounded-2xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">{headline}</h2>
              {briefing.hiddenCount > 0 ? (
                <Link
                  href={`${base}/operations`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-nexus-blue hover:underline"
                >
                  Ver todas ({totalDecisions}) <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
            {briefing.decisions.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground">
                <ShieldCheck className="size-5 shrink-0 text-emerald-500" />
                Nada detenido, sin SLA vencidos y la cobranza al día. NEXUS sigue
                vigilando por ti.
              </div>
            ) : (
              <div className="divide-y">
                {briefing.decisions.map((d) => {
                  const tone = TONE_STYLES[d.tone]
                  const Icon = DECISION_ICONS[d.id] ?? AlertTriangle
                  return (
                    <div key={d.id} className="flex items-center gap-4 px-5 py-4">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone.chip}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug text-foreground">
                          {d.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{d.detail}</p>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide sm:inline-flex ${tone.badge}`}
                      >
                        {d.badge}
                      </span>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={`${base}/${d.segment}`}>{d.actionLabel}</Link>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section aria-label="Ahora en campo">
          <div className="flex h-full flex-col rounded-2xl border bg-card">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">Ahora en campo</h2>
              {activeEntries.length > 0 ? (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded bg-nexus-blue/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-nexus-blue">
                  <span className="size-1.5 animate-pulse rounded-full bg-nexus-blue" />
                  Vivo
                </span>
              ) : null}
            </div>
            {activeEntries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No hay operaciones en ejecución ahora.
              </p>
            ) : (
              <div className="divide-y">
                {activeEntries.map((e, i) => {
                  const job = e.activeJob!
                  const eta = etas[i]?.arrivalAt ?? null
                  return (
                    <Link
                      key={e.technicianId}
                      href={`${base}/work-orders/${job.workOrderId}`}
                      className="block px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {e.technicianName}
                        </p>
                        <span className="shrink-0 text-[11px] font-medium text-nexus-blue">
                          {EXECUTION_STATUS_LABELS[job.executionStatus]}
                          {eta ? ` · llega ${formatTime(eta)}` : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {job.workOrderNumber ? `#${job.workOrderNumber} · ` : ""}
                        {job.workOrderSubject ?? "Orden en curso"}
                        {job.companyName ? ` — ${job.companyName}` : ""}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
