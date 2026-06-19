import { Radio, Receipt } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { MissionAllClear } from "@/components/dashboard/mission/mission-alert-card"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getFieldMonitorBoard } from "@/modules/field-execution/composition"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { buildOwnerDashboard } from "@/modules/platform/application/owner-dashboard"
import { greetingFor } from "@/modules/platform/presentation/mission-control"
import { listTenantCases } from "@/modules/service/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Centro Operacional" }

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})
const cop = (n: number | null): string => (n == null ? "—" : COP.format(n))

/** "hace X min/h/d" — relativo simple, sin librerías. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.max(0, Math.round(diffMs / 60000))
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

// Estado de ejecución → etiqueta corta para el rail "Se está ejecutando".
const EXEC_LIVE_LABEL: Partial<Record<ExecutionStatus, string>> = {
  accepted: "En camino",
  on_site: "En sitio",
  working: "Trabajando",
}
const EXEC_LIVE_TONE: Partial<Record<ExecutionStatus, string>> = {
  accepted: "text-orange-600 dark:text-orange-400",
  on_site: "text-emerald-600 dark:text-emerald-400",
  working: "text-blue-600 dark:text-blue-400",
}

export default async function MissionControlPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.dashboardRead)

  const can = (p: string) => hasPermission(context.effectivePermissions, p)
  const base = `/app/${tenantSlug}`

  // Enlace público de reportes: hace visible la entrada del Golden Path (reporte).
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)

  const [user, casesPage, inbox, board, invoicesPage] = await Promise.all([
    getCachedCurrentUser(),
    canCases
      ? listTenantCases(
          context.tenantId,
          { search: null, status: null, priority: null, ownerId: null },
          1,
          8,
        )
      : Promise.resolve(null),
    canDispatch ? listDispatchInbox(context.tenantId) : Promise.resolve(null),
    canDispatch ? getFieldMonitorBoard(context.tenantId) : Promise.resolve(null),
    canInvoices
      ? listTenantInvoices(context.tenantId, {
          search: null,
          status: null,
          companyId: null,
          page: 1,
          pageSize: 1000,
        })
      : Promise.resolve(null),
  ])

  // ── Zona 1 — "Entró hoy": casos creados hoy (zona horaria del tenant). ──────
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const enteredToday = (casesPage?.items ?? []).filter(
    (c) =>
      new Date(c.createdAt).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) ===
      todayISO,
  )

  // ── Zona 2 — "Requiere tu decisión": propuestas (héroe) + excepciones. ──────
  const proposals = inbox?.proposals ?? []
  const exceptions = inbox?.exceptions ?? []
  const decisionCount = proposals.length + exceptions.length

  // ── Rail — "Se está ejecutando": técnicos con trabajo activo ahora. ─────────
  const activeOps = (board?.entries ?? []).filter((e) => e.activeJob)

  // ── Rail — "Por cobrar": facturas pendientes (cierre del lazo). ─────────────
  const owner = buildOwnerDashboard({
    invoices: invoicesPage?.items ?? null,
    acceptedQuotes: null,
    openWorkOrders: null,
    unassignedWorkOrders: 0,
    todayISO,
  })
  const receivables = (invoicesPage?.items ?? [])
    .filter((i) => i.status === "issued" || i.status === "partially_paid")
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const name = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ")
  const greeting = greetingFor(new Date().getUTCHours())
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  })

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {today} · {context.tenant.name} · ¿Qué necesita mi atención ahora mismo?
        </p>
      </header>

      {/* Activación: entrada del Golden Path (reporte público) */}
      {reportUrl ? (
        <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
      ) : null}

      {/* Operación en dos columnas: decisión (principal) + ejecución/cobro (rail) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-7 lg:col-span-2">
          {/* Zona 1 — Entró hoy */}
          {canCases ? (
            <MissionSection
              title={`Entró hoy${enteredToday.length ? ` · ${enteredToday.length}` : ""}`}
              description="Solicitudes nuevas que llegaron al sistema."
            >
              {enteredToday.length === 0 ? (
                <MissionAllClear />
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <ul className="divide-y">
                    {enteredToday.map((c) => (
                      <li key={c.caseNumber}>
                        <Link
                          href={`${base}/cases`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {c.companyName ?? c.subject}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.subject}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {timeAgo(c.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </MissionSection>
          ) : null}

          {/* Zona 2 — Requiere tu decisión (héroe: propuesta de Nexus) */}
          <MissionSection
            title={`Requiere tu decisión${decisionCount ? ` · ${decisionCount}` : ""}`}
            description="Nexus coordinó lo que pudo. Esto necesita tu confirmación o tu criterio."
          >
            {!canDispatch || decisionCount === 0 ? (
              <MissionAllClear />
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
                ))}
                {exceptions.map((e) => (
                  <DispatchExceptionCard key={e.caseId} exception={e} />
                ))}
              </div>
            )}
          </MissionSection>
        </div>

        {/* Rail — ejecución + cobro */}
        <aside className="space-y-6">
          {/* Se está ejecutando */}
          {canDispatch ? (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Radio className="size-4 text-emerald-500" />
                Se está ejecutando{activeOps.length ? ` · ${activeOps.length}` : ""}
              </h2>
              {activeOps.length === 0 ? (
                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                  Sin operaciones activas ahora.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <ul className="divide-y">
                    {activeOps.map((e, i) => {
                      const st = e.activeJob!.executionStatus
                      return (
                        <li key={e.activeJob!.workOrderNumber ?? `op-${i}`} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {e.technicianName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {e.activeJob!.companyName ?? e.activeJob!.workOrderSubject ?? "—"}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 text-xs font-medium ${EXEC_LIVE_TONE[st] ?? "text-muted-foreground"}`}
                            >
                              {EXEC_LIVE_LABEL[st] ?? st}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </section>
          ) : null}

          {/* Por cobrar */}
          {canInvoices ? (
            <section>
              <h2 className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2">
                  <Receipt className="size-4 text-emerald-500" />
                  Por cobrar
                </span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {cop(owner.receivable)}
                </span>
              </h2>
              {receivables.length === 0 ? (
                <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                  Nada pendiente de cobro.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border bg-card">
                  <ul className="divide-y">
                    {receivables.map((inv) => (
                      <li key={inv.id}>
                        <Link
                          href={`${base}/invoices/${inv.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {inv.companyName ?? "—"}
                            </span>
                            <span className="block truncate text-xs tabular-nums text-muted-foreground">
                              {inv.invoiceNumber ?? "Borrador"}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {cop(inv.balance)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {owner.overdueInvoices > 0 ? (
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                  {owner.overdueInvoices} factura(s) vencida(s)
                </p>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
