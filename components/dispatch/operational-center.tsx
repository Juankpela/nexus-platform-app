import { ArrowRight, Gauge, ShieldCheck, Sparkles, Timer, UserX, AlertTriangle } from "lucide-react"
import Link from "next/link"

import { InsightBanner, type InsightLevel } from "@/components/dashboard/insight-banner"
import { ActiveOperationCard } from "@/components/dispatch/active-operation-card"
import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { CompletedOperationCard } from "@/components/dispatch/completed-operation-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import {
  BILLING_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import { listDispatchInbox, readEnRouteEta } from "@/modules/scheduling/composition"
import {
  getTenantWorkOrderStats,
  getWorkOrderLifecycle,
  listTenantWorkOrders,
} from "@/modules/service/composition"
import { getTenantCaseStats } from "@/modules/service/composition"
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
} from "@/modules/service/domain/work-order"
import { todayInAppZone } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
import type { UUID } from "@/types/shared"

/** Tile compacto de la barra de PULSO. El dinero va `muted` (menor peso visual). */
function PulseTile({
  label,
  value,
  hint,
  accent = "blue",
  muted = false,
  href,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: "blue" | "emerald" | "orange" | "silver"
  muted?: boolean
  href?: string
}) {
  const accentText = {
    blue: "text-nexus-blue",
    emerald: "text-emerald-500 dark:text-emerald-400",
    orange: "text-orange-500 dark:text-orange-400",
    silver: "text-muted-foreground",
  }[accent]
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${muted ? "bg-muted-foreground/40" : accentText.replace("text-", "bg-")}`} />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 tabular-nums font-semibold tracking-tight ${
          muted ? "text-base text-muted-foreground" : `text-2xl ${accentText}`
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </>
  )
  const cls = "rounded-xl border bg-card px-3 py-2.5"
  return href ? (
    <Link href={href} className={`${cls} block transition-colors hover:bg-muted/30`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

const STATUS_BAR_COLOR: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  scheduled: "bg-nexus-blue/50",
  dispatched: "bg-nexus-blue",
  in_progress: "bg-nexus-blue",
  on_hold: "bg-orange-500",
  completed: "bg-emerald-500",
  cancelled: "bg-muted-foreground/30",
}

/** Distribución por estado (contexto): barras proporcionales sobre datos ya agregados. */
function StatusDistribution({ byStatus }: { byStatus: Record<string, number> }) {
  const total = WORK_ORDER_STATUSES.reduce((s, k) => s + (byStatus[k] ?? 0), 0)
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Distribución por estado</h3>
      <p className="mb-3 text-[11px] text-muted-foreground">{total} órdenes en total</p>
      <div className="space-y-2">
        {WORK_ORDER_STATUSES.map((s) => {
          const n = byStatus[s] ?? 0
          const pct = total > 0 ? Math.round((n / total) * 100) : 0
          return (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-muted-foreground">
                {WORK_ORDER_STATUS_LABELS[s]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${STATUS_BAR_COLOR[s] ?? "bg-nexus-blue"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums font-medium text-foreground">
                {n} <span className="text-muted-foreground">·{pct}%</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Gauge de cumplimiento SLA (contexto). Semicírculo simple sobre un % ya calculado. */
function SlaGauge({ pct }: { pct: number | null }) {
  const value = pct ?? 0
  const tone = value >= 90 ? "text-emerald-500" : value >= 75 ? "text-orange-500" : "text-red-500"
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4">
      <h3 className="self-start text-sm font-semibold text-foreground">Cumplimiento SLA</h3>
      <div className="relative my-2 grid size-24 place-items-center">
        <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
            className={tone.replace("text-", "stroke-")}
            strokeDasharray={`${(value / 100) * 264} 264`}
          />
        </svg>
        <span className={`absolute text-xl font-semibold tabular-nums ${tone}`}>
          {pct != null ? `${value}%` : "—"}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">Casos dentro de SLA</p>
    </div>
  )
}

/**
 * Centro Operacional — Inicio. JERARQUÍA (PRODUCT-007, opción A):
 *   1) Héroe de decisión (N-LABS / Nexus recomienda) — el diferenciador, arriba.
 *   2) KPIs ejecutivos.
 *   3) Visualizaciones que explican el estado de la operación (contexto).
 *   4) Operación en vivo + alertas.
 *   5) Secundario.
 * Reutiliza por completo consultas y tarjetas existentes (sin dominio ni
 * migraciones nuevas): las gráficas dan CONTEXTO a la decisión, no compiten con ella.
 */
export async function OperationalCenter({
  tenantSlug,
  tenantId,
  permissions,
}: {
  tenantSlug: string
  tenantId: UUID
  permissions: readonly string[]
}) {
  const can = (p: string) => hasPermission(permissions, p)
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const today = todayInAppZone()

  const [inbox, board, completedPage, invoicesPage, stats, woStats, caseStats] =
    await Promise.all([
      listDispatchInbox(tenantId),
      getFieldMonitorBoard(tenantId),
      canWorkOrders
        ? listTenantWorkOrders(
            tenantId,
            { search: null, status: "completed", priority: null, technicianId: null, companyId: null, assetId: null, dateFrom: null, dateTo: null },
            1,
            8,
          )
        : Promise.resolve(null),
      canInvoices
        ? listTenantInvoices(tenantId, { search: null, status: null, companyId: null, page: 1, pageSize: 1000 })
        : Promise.resolve(null),
      canDispatch ? getTenantDispatchStats(tenantId, today) : Promise.resolve(null),
      canWorkOrders ? getTenantWorkOrderStats(tenantId) : Promise.resolve(null),
      canCases ? getTenantCaseStats(tenantId) : Promise.resolve(null),
    ])

  const { proposals, exceptions } = inbox

  // Operaciones activas: técnicos con un job en ejecución (línea de vida canónica).
  const activeRaw = board.entries.filter((e) => e.activeJob)
  const [lifecycles, etas] = await Promise.all([
    Promise.all(activeRaw.map((e) => getWorkOrderLifecycle(tenantId, e.activeJob!.workOrderId))),
    Promise.all(
      activeRaw.map((e) =>
        e.activeJob!.assignmentId ? readEnRouteEta(tenantId, e.activeJob!.assignmentId) : Promise.resolve(null),
      ),
    ),
  ])
  const activeOps = activeRaw.map((e, i) => ({
    op: {
      technicianName: e.technicianName,
      technicianId: e.technicianId,
      workOrderNumber: e.activeJob!.workOrderNumber,
      workOrderId: e.activeJob!.workOrderId,
      workOrderSubject: e.activeJob!.workOrderSubject,
      companyName: e.activeJob!.companyName,
      priority: e.activeJob!.priority,
      executionStatus: e.activeJob!.executionStatus,
    },
    milestones: lifecycles[i] ?? [],
    etaArrivalAt: etas[i]?.arrivalAt ?? null,
  }))

  const invByWo = new Map(
    (invoicesPage?.items ?? [])
      .filter((i) => i.workOrderId)
      .map((i) => [i.workOrderId as string, { invoiceNumber: i.invoiceNumber, totalAmount: i.totalAmount, balance: i.balance }]),
  )
  const completedOps = (completedPage?.items ?? []).map((w) => ({
    workOrderNumber: w.workOrderNumber,
    subject: w.subject,
    companyName: w.companyName,
    actualStart: w.actualStart,
    actualEnd: w.actualEnd,
    invoice: invByWo.get(w.id) ?? null,
  }))

  const invoices = invoicesPage?.items ?? []
  const porCobrar = invoices.reduce((s, i) => s + (i.balance > 0 ? i.balance : 0), 0)
  // Vencidos ACTIVOS (lo accionable): coincide con la lista a la que llevamos al usuario.
  const openBreached = caseStats?.openBreachedCount ?? 0

  // Alertas críticas (contexto de decisión): todo derivado de datos ya cargados.
  const alerts: { tone: "critical" | "attention"; icon: typeof AlertTriangle; title: string; detail: string; href: string }[] = []
  if (openBreached > 0)
    alerts.push({ tone: "critical", icon: ShieldCheck, title: `${openBreached} ${openBreached === 1 ? "SLA vencido" : "SLA vencidos"}`, detail: "Ábrelos y márcalos como Resuelto", href: `/app/${tenantSlug}/cases?sla=overdue` })
  if (exceptions.length > 0)
    alerts.push({ tone: "attention", icon: AlertTriangle, title: `${exceptions.length} sin coordinar`, detail: "El motor no pudo asignarlas solo", href: `/app/${tenantSlug}/dispatch` })
  if (stats && stats.overloadedTechnicians > 0)
    alerts.push({ tone: "attention", icon: UserX, title: `${stats.overloadedTechnicians} técnicos sobrecargados`, detail: "Rebalancea la carga del día", href: `/app/${tenantSlug}/field-monitor` })

  // ── Insight ejecutivo: interpreta el estado en una frase (datos ya calculados) ──
  const overloaded = stats?.overloadedTechnicians ?? 0
  const slaPct = caseStats?.slaCompliancePct ?? null
  const issues: string[] = []
  if (overloaded > 0) issues.push(`${overloaded} ${overloaded === 1 ? "técnico sobrecargado" : "técnicos sobrecargados"}`)
  if (exceptions.length > 0) issues.push(`${exceptions.length} ${exceptions.length === 1 ? "solicitud sin coordinar" : "solicitudes sin coordinar"}`)
  if (openBreached > 0) issues.push(`${openBreached} ${openBreached === 1 ? "SLA vencido" : "SLA vencidos"}`)
  const insightLevel: InsightLevel = issues.length === 0 ? "healthy" : "attention"
  const insightDetail =
    issues.length === 0
      ? `SLA en ${slaPct ?? "—"}%${stats ? `, ${stats.availableTechnicians} técnicos disponibles` : ""}. Nada requiere tu decisión ahora.`
      : `${issues.join(" · ")}.${porCobrar > 0 && canInvoices ? ` Hay ${formatCOP(porCobrar)} por cobrar.` : ""}`
  // El botón único prioriza el SLA vencido (lo más urgente para el cliente), luego despacho, luego carga.
  const insightAction =
    openBreached > 0
      ? { label: "Resolver SLA vencidos", href: `/app/${tenantSlug}/cases?sla=overdue` }
      : exceptions.length > 0
        ? { label: "Resolver", href: `/app/${tenantSlug}/dispatch` }
        : overloaded > 0
          ? { label: "Ver fuerza de campo", href: `/app/${tenantSlug}/field-monitor` }
          : undefined

  return (
    <div className="space-y-6">
      <InsightBanner
        level={insightLevel}
        headline={issues.length === 0 ? "Operación saludable" : "Atención requerida"}
        detail={insightDetail}
        action={insightAction}
      />

      {/* ── #1 HÉROE — la decisión de N-LABS es lo más importante ───────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Nexus recomienda" className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue">
                <Sparkles className="size-4" />
              </span>
              <h2 className="text-base font-semibold text-foreground">
                N-LABS recomienda
                {proposals.length ? <span className="ml-2 text-sm font-normal text-muted-foreground">· {proposals.length}</span> : null}
              </h2>
            </div>
            <Link href={`/app/${tenantSlug}/nlabs`} className="inline-flex items-center gap-1 text-xs font-medium text-nexus-blue hover:underline">
              Ver inteligencia <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {proposals.length > 0 ? (
            <div className="space-y-3">
              {proposals.map((p) => (
                <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              N-LABS tiene la operación al día. Nada requiere tu decisión en este momento.
            </div>
          ) : (
            // No hay propuestas auto-despachables, pero SÍ hay asuntos que requieren criterio
            // humano (SLA vencido, sin coordinar, sobrecarga). El héroe es honesto y dirige.
            <div className="rounded-2xl border border-orange-200/70 bg-orange-50/40 p-5 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
              <p>
                N-LABS ya coordinó todo lo automatizable. Lo que ves marcado abajo
                requiere tu decisión.
              </p>
              {insightAction ? (
                <Link
                  href={insightAction.href}
                  className="mt-3 inline-flex items-center gap-1 font-medium text-orange-900 hover:underline dark:text-orange-200"
                >
                  {insightAction.label} <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          )}
        </section>

        <section aria-label="Requiere tu atención">
          <div className="mb-3 flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${exceptions.length > 0 ? "bg-orange-500" : "bg-muted-foreground/40"}`} />
            <h2 className="text-base font-semibold text-foreground">
              Requiere tu atención
              {exceptions.length ? <span className="ml-2 text-sm font-normal text-muted-foreground">· {exceptions.length}</span> : null}
            </h2>
          </div>
          {exceptions.length === 0 ? (
            <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              Nada bloqueado. N-LABS está coordinando todo solo.
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map((e) => (
                <DispatchExceptionCard key={e.caseId} exception={e} tenantSlug={tenantSlug} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── #2 KPIs EJECUTIVOS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <PulseTile label="Operaciones activas" value={activeOps.length} accent="blue" />
        {woStats ? <PulseTile label="En progreso" value={woStats.byStatus.in_progress ?? 0} accent="blue" hint={`${woStats.openCount} abiertas`} /> : null}
        {woStats ? <PulseTile label="Completadas (mes)" value={woStats.completedThisMonth} accent="emerald" /> : null}
        {caseStats ? <PulseTile label="Cumplimiento SLA" value={caseStats.slaCompliancePct != null ? `${caseStats.slaCompliancePct}%` : "—"} accent={caseStats.slaCompliancePct != null && caseStats.slaCompliancePct >= 90 ? "emerald" : "orange"} /> : null}
        {stats ? <PulseTile label="Técnicos disponibles" value={stats.availableTechnicians} accent="emerald" hint={`${stats.busyTechnicians} ocupados · ${stats.overloadedTechnicians} sobrecargados`} href={`/app/${tenantSlug}/field-monitor`} /> : null}
        {canInvoices ? <PulseTile label="Por cobrar" value={formatCOP(porCobrar)} muted href={`/app/${tenantSlug}/invoices`} /> : null}
      </div>

      {/* ── #3 VISUALIZACIONES DE CONTEXTO ─────────────────────────────────── */}
      {woStats || caseStats ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {woStats ? <StatusDistribution byStatus={woStats.byStatus} /> : null}
          {caseStats ? <SlaGauge pct={caseStats.slaCompliancePct} /> : null}
          {woStats ? (
            <div className="flex flex-col justify-center rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue"><Timer className="size-4" /></span>
                <h3 className="text-sm font-semibold text-foreground">Tiempo prom. de resolución</h3>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
                {woStats.avgResolutionHours != null ? `${woStats.avgResolutionHours} h` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Desde apertura hasta completado</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── #4 OPERACIÓN EN VIVO + ALERTAS ─────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Operación en marcha" className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded bg-nexus-blue/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-nexus-blue">VIVO</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Operación en marcha · línea de vida</span>
            <Link href={`/app/${tenantSlug}/work-orders`} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              Ver Trabajo <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {activeOps.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No hay operaciones en ejecución ahora.</p>
            ) : (
              <div className="divide-y">
                {activeOps.map((a, i) => (
                  <ActiveOperationCard key={a.op.workOrderNumber ?? `op-${i}`} op={a.op} milestones={a.milestones} tenantSlug={tenantSlug} etaArrivalAt={a.etaArrivalAt} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section aria-label="Alertas críticas">
          <div className="mb-3 flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${alerts.some((a) => a.tone === "critical") ? "bg-red-500" : alerts.length ? "bg-orange-500" : "bg-emerald-500"}`} />
            <h2 className="text-base font-semibold text-foreground">Alertas críticas</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-5 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              Sin alertas. La operación está bajo control.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <Link key={i} href={a.href} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30 ${a.tone === "critical" ? "border-red-200/70 dark:border-red-900/40" : "border-orange-200/70 dark:border-orange-900/40"}`}>
                  <a.icon className={`mt-0.5 size-4 shrink-0 ${a.tone === "critical" ? "text-red-500" : "text-orange-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── #5 SECUNDARIO: capacidad del día + completadas + cobranza ───────── */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-4">
          <PulseTile label="Técnicos activos" value={`${stats.activeTechnicians}`} accent="silver" />
          <PulseTile label="Asignaciones hoy" value={stats.assignmentsToday} accent="silver" />
          <PulseTile label="Utilización prom." value={stats.averageUtilization != null ? `${stats.averageUtilization}%` : "—"} accent="silver" />
          <PulseTile label="Ocupados" value={stats.busyTechnicians} accent="silver" />
        </div>
      ) : null}

      {canWorkOrders && completedOps.length > 0 ? (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Completadas recientemente · {completedOps.length}
          </summary>
          <div className="mt-3 space-y-3">
            {completedOps.map((op) => (
              <CompletedOperationCard key={op.workOrderNumber} op={op} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
