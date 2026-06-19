import { Building2, LifeBuoy, Radar, Receipt, Target, Users, Wrench } from "lucide-react"
import type { Metadata } from "next"

import { AssistedProposalCard } from "@/components/dispatch/assisted-proposal-card"
import { DispatchExceptionCard } from "@/components/dispatch/dispatch-exception-card"
import { MissionAllClear } from "@/components/dashboard/mission/mission-alert-card"
import { MissionMetricCard } from "@/components/dashboard/mission/mission-metric-card"
import { MissionQuickAction } from "@/components/dashboard/mission/mission-quick-action"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { listDispatchInbox } from "@/modules/scheduling/composition"
import { buildOwnerDashboard } from "@/modules/platform/application/owner-dashboard"
import { greetingFor } from "@/modules/platform/presentation/mission-control"
import {
  getTenantCaseStats,
  getTenantWorkOrderStats,
} from "@/modules/service/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Centro Operacional" }

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})
const cop = (n: number | null): string => (n == null ? "—" : COP.format(n))

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
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)

  const OWNER_PAGE_SIZE = 1000

  const [user, caseStats, woStats, inbox, invoicesPage] = await Promise.all([
    getCachedCurrentUser(),
    canCases ? getTenantCaseStats(context.tenantId) : Promise.resolve(null),
    canWorkOrders ? getTenantWorkOrderStats(context.tenantId) : Promise.resolve(null),
    canDispatch ? listDispatchInbox(context.tenantId) : Promise.resolve(null),
    canInvoices
      ? listTenantInvoices(context.tenantId, {
          search: null,
          status: null,
          companyId: null,
          page: 1,
          pageSize: OWNER_PAGE_SIZE,
        })
      : Promise.resolve(null),
  ])

  // "Por cobrar" reutiliza el agregador existente (sin consulta nueva).
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const owner = buildOwnerDashboard({
    invoices: invoicesPage?.items ?? null,
    acceptedQuotes: null,
    openWorkOrders: woStats?.openCount ?? null,
    unassignedWorkOrders: 0,
    todayISO,
  })

  const proposals = inbox?.proposals ?? []
  const exceptions = inbox?.exceptions ?? []
  const attentionCount = proposals.length + exceptions.length

  const name = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ")
  const greeting = greetingFor(new Date().getUTCHours())
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  })

  const quickActions = [
    { label: "Empresa", icon: Building2, href: `${base}/companies`, show: can(CRM_PERMISSIONS.companiesWrite) },
    { label: "Oportunidad", icon: Target, href: `${base}/opportunities`, show: can(CRM_PERMISSIONS.opportunitiesWrite) },
    { label: "Solicitud", icon: LifeBuoy, href: `${base}/cases`, show: can(SERVICE_PERMISSIONS.casesWrite) },
    { label: "Orden de trabajo", icon: Wrench, href: `${base}/work-orders`, show: can(SERVICE_PERMISSIONS.workOrdersWrite) },
    { label: "Técnico", icon: Users, href: `${base}/technicians`, show: can(SERVICE_PERMISSIONS.techniciansWrite) },
  ].filter((a) => a.show)

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {today} · {context.tenant.name}
          </p>
        </div>
        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <MissionQuickAction key={a.href} {...a} />
            ))}
          </div>
        ) : null}
      </header>

      {/* Activación: entrada del Golden Path (reporte público) */}
      {reportUrl ? (
        <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
      ) : null}

      {/* Centro Operacional — 4 contadores verbo (datos existentes) */}
      <MissionSection
        title="Centro Operacional"
        description="¿Qué necesita mi atención ahora mismo?"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MissionMetricCard
            label="Casos abiertos"
            value={caseStats?.openCount ?? "—"}
            icon={LifeBuoy}
            accent="orange"
            href={`${base}/cases`}
          />
          <MissionMetricCard
            label="Por coordinar"
            value={canDispatch ? proposals.length : "—"}
            icon={Radar}
            accent="blue"
            href={`${base}/dispatch/assisted`}
          />
          <MissionMetricCard
            label="En ejecución"
            value={woStats?.byStatus.in_progress ?? "—"}
            icon={Wrench}
            accent="blue"
            href={`${base}/work-orders`}
          />
          <MissionMetricCard
            label="Por cobrar"
            value={cop(owner.receivable)}
            icon={Receipt}
            accent="emerald"
            hint={owner.overdueInvoices > 0 ? `${owner.overdueInvoices} vencida(s)` : undefined}
            href={`${base}/invoices`}
          />
        </div>
      </MissionSection>

      {/* Requiere tu atención ahora — la propuesta de coordinación es el héroe */}
      <MissionSection
        title="Requiere tu atención ahora"
        description="Nexus coordinó lo que pudo. Esto necesita tu confirmación o tu criterio."
      >
        {!canDispatch || attentionCount === 0 ? (
          <MissionAllClear />
        ) : (
          <div className="space-y-3">
            {/* Propuestas listas para confirmar (primero) */}
            {proposals.map((p) => (
              <AssistedProposalCard key={p.caseId} tenantSlug={tenantSlug} proposal={p} />
            ))}
            {/* Excepciones que requieren criterio humano */}
            {exceptions.map((e) => (
              <DispatchExceptionCard key={e.caseId} exception={e} />
            ))}
          </div>
        )}
      </MissionSection>
    </div>
  )
}
