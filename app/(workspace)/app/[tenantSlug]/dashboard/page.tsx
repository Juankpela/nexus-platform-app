import {
  Banknote,
  Building2,
  Cpu,
  Gauge,
  LifeBuoy,
  Receipt,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { MissionAlertCard, MissionAllClear } from "@/components/dashboard/mission/mission-alert-card"
import { MissionMetricCard } from "@/components/dashboard/mission/mission-metric-card"
import { MissionQuickAction } from "@/components/dashboard/mission/mission-quick-action"
import { MissionSection } from "@/components/dashboard/mission/mission-section"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  FORECASTING_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import {
  getTenantDashboardStats,
  listTenantCompanies,
  listTenantOpportunities,
  listTenantQuotes,
} from "@/modules/crm/composition"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { selectUnassignedWorkOrders } from "@/modules/dispatch/application/select-unassigned"
import { getTenantRevenueMetrics } from "@/modules/forecasting/composition"
import { getCachedCurrentUser } from "@/modules/identity/composition"
import { getActiveAssignmentsByWorkOrder } from "@/modules/scheduling/composition"
import { buildOwnerDashboard } from "@/modules/platform/application/owner-dashboard"
import { OnboardingCard } from "@/components/dashboard/onboarding-card"
import { StartReceivingCard } from "@/components/dashboard/start-receiving-card"
import {
  buildAttentionItems,
  greetingFor,
} from "@/modules/platform/presentation/mission-control"
import {
  getTenantCaseStats,
  getTenantWorkOrderStats,
  listTenantTechnicians,
  listTenantWorkOrders,
} from "@/modules/service/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Mission Control" }

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  if (value === 0) return "$0"
  return `$${value.toLocaleString()}`
}

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

  // Enlace público de reportes (mismo patrón que el link de aprobación de
  // cotizaciones): hace visible una capacidad existente para activar el día 1.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const reportUrl = appUrl ? `${appUrl}/r/${tenantSlug}` : null

  const canCrm = can(CRM_PERMISSIONS.opportunitiesRead)
  const canCases = can(SERVICE_PERMISSIONS.casesRead)
  const canWorkOrders = can(SERVICE_PERMISSIONS.workOrdersRead)
  const canDispatch = can(SERVICE_PERMISSIONS.dispatchRead)
  const canForecast = can(FORECASTING_PERMISSIONS.read)
  const canInvoices = can(BILLING_PERMISSIONS.invoicesRead)
  const canQuotes = can(CRM_PERMISSIONS.quotesRead)
  const canCompanies = can(CRM_PERMISSIONS.companiesRead)
  const canTechnicians = can(SERVICE_PERMISSIONS.techniciansRead)
  // Onboarding card is for the owner setting up: only when all 5 areas readable.
  const canOnboarding =
    canCompanies && canTechnicians && canWorkOrders && canQuotes && canInvoices

  // Owner-dashboard reads use a single large page (PYME volume); the aggregation
  // is the seam if this ever needs a SQL rollup.
  const OWNER_PAGE_SIZE = 1000

  const [
    user,
    stats,
    revenue,
    caseStats,
    woStats,
    dispatch,
    topOpps,
    invoicesPage,
    acceptedQuotesPage,
    allWorkOrdersPage,
    companiesCountPage,
    techniciansCountPage,
    quotesCountPage,
  ] = await Promise.all([
    getCachedCurrentUser(),
    getTenantDashboardStats(context.tenantId),
    canForecast
      ? getTenantRevenueMetrics(context.tenantId, "all_time")
      : Promise.resolve(null),
    canCases ? getTenantCaseStats(context.tenantId) : Promise.resolve(null),
    canWorkOrders ? getTenantWorkOrderStats(context.tenantId) : Promise.resolve(null),
    canDispatch ? getTenantDispatchStats(context.tenantId, new Date().toISOString().slice(0, 10)) : Promise.resolve(null),
    canCrm
      ? listTenantOpportunities(context.tenantId, { search: null, status: null }, 1, 5)
      : Promise.resolve(null),
    canInvoices
      ? listTenantInvoices(context.tenantId, { search: null, status: null, companyId: null, page: 1, pageSize: OWNER_PAGE_SIZE })
      : Promise.resolve(null),
    canQuotes
      ? listTenantQuotes(context.tenantId, { search: null, status: "accepted", companyId: null, page: 1, pageSize: OWNER_PAGE_SIZE })
      : Promise.resolve(null),
    canWorkOrders
      ? listTenantWorkOrders(
          context.tenantId,
          { search: null, status: null, priority: null, technicianId: null, companyId: null, assetId: null, dateFrom: null, dateTo: null },
          1,
          OWNER_PAGE_SIZE,
        )
      : Promise.resolve(null),
    // Onboarding counts (page size 1 → only the total is needed).
    canOnboarding
      ? listTenantCompanies(context.tenantId, { search: null, page: 1, pageSize: 1 })
      : Promise.resolve(null),
    canOnboarding
      ? listTenantTechnicians(context.tenantId, { search: null, status: null }, "name", 1, 1)
      : Promise.resolve(null),
    canOnboarding
      ? listTenantQuotes(context.tenantId, { search: null, status: null, companyId: null, page: 1, pageSize: 1 })
      : Promise.resolve(null),
  ])

  // Open work orders without an active assignment (ADR-031): aligns the owner's
  // "Órdenes sin asignar" alert with what the Dispatch board surfaces.
  let unassignedWorkOrders = 0
  if (allWorkOrdersPage) {
    const activeMap = await getActiveAssignmentsByWorkOrder(
      context.tenantId,
      allWorkOrdersPage.items.map((w) => w.id),
    )
    unassignedWorkOrders = selectUnassignedWorkOrders(
      allWorkOrdersPage.items,
      new Set(activeMap.keys()),
    ).length
  }

  // Activation flow counts (reuse loaded data; count-only queries for the rest).
  const onboardingCounts = canOnboarding
    ? {
        clientes: companiesCountPage?.total ?? 0,
        tecnicos: techniciansCountPage?.total ?? 0,
        trabajos: allWorkOrdersPage?.total ?? 0,
        cotizaciones: quotesCountPage?.total ?? 0,
        facturas: invoicesPage?.total ?? 0,
      }
    : null

  // ── Owner block (Tu negocio hoy) ─────────────────────────────────────────────
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const owner = buildOwnerDashboard({
    invoices: invoicesPage?.items ?? null,
    acceptedQuotes: acceptedQuotesPage?.items ?? null,
    openWorkOrders: woStats?.openCount ?? null,
    unassignedWorkOrders,
    todayISO,
  })

  const name = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ")
  const greeting = greetingFor(new Date().getUTCHours())
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  })

  const attention = buildAttentionItems({
    breachedCases: caseStats?.breachedCount ?? 0,
    criticalCases: caseStats?.byPriority.critical ?? 0,
    overloadedTechnicians: dispatch?.overloadedTechnicians ?? 0,
    unscheduledWorkOrders: woStats?.byStatus.new ?? 0,
  })

  const quickActions = [
    { label: "Empresa", icon: Building2, href: `${base}/companies`, show: can(CRM_PERMISSIONS.companiesWrite) },
    { label: "Oportunidad", icon: Target, href: `${base}/opportunities`, show: can(CRM_PERMISSIONS.opportunitiesWrite) },
    { label: "Caso", icon: LifeBuoy, href: `${base}/cases`, show: can(SERVICE_PERMISSIONS.casesWrite) },
    { label: "Orden de trabajo", icon: Wrench, href: `${base}/work-orders`, show: can(SERVICE_PERMISSIONS.workOrdersWrite) },
    { label: "Técnico", icon: Users, href: `${base}/technicians`, show: can(SERVICE_PERMISSIONS.techniciansWrite) },
  ].filter((a) => a.show)

  return (
    <div className="space-y-7 px-5 py-6 sm:px-8">
      {/* 1 — Welcome header */}
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

      {/* Activación día 1: hace visible el enlace público de reportes */}
      {reportUrl ? (
        <StartReceivingCard url={reportUrl} tenantName={context.tenant.name} />
      ) : null}

      {/* Activation flow: next step toward the first invoice */}
      {onboardingCounts ? (
        <OnboardingCard base={base} counts={onboardingCounts} />
      ) : null}

      {/* 0 — Owner block: tu negocio en 10 segundos */}
      <MissionSection
        title="Tu negocio hoy"
        description="Lo esencial, de un vistazo."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MissionMetricCard
            label="Vendido este mes"
            value={cop(owner.salesThisMonth)}
            icon={Banknote}
            accent="emerald"
            href={`${base}/invoices`}
          />
          <MissionMetricCard
            label="Por cobrar"
            value={cop(owner.receivable)}
            icon={Receipt}
            accent="orange"
            hint={owner.overdueInvoices > 0 ? `${owner.overdueInvoices} vencida(s)` : undefined}
            href={`${base}/invoices`}
          />
          <MissionMetricCard
            label="Trabajos activos"
            value={owner.activeWorkOrders ?? "—"}
            icon={Wrench}
            accent="blue"
            href={`${base}/work-orders`}
          />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-foreground">Atención hoy</p>
          {owner.attention.length === 0 ? (
            <MissionAllClear />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {owner.attention.map((item) => (
                <MissionAlertCard
                  key={item.key}
                  label={item.label}
                  count={item.count}
                  severity={item.severity}
                  href={`${base}/${item.segment}`}
                />
              ))}
            </div>
          )}
        </div>
      </MissionSection>

      {/* 3 — Attention Center (urgent first) */}
      <MissionSection
        title="Requiere atención"
        description="Lo que necesita acción inmediata hoy."
      >
        {attention.length === 0 ? (
          <MissionAllClear />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {attention.map((item) => (
              <MissionAlertCard
                key={item.key}
                label={item.label}
                count={item.count}
                severity={item.severity}
                href={`${base}/${item.segment}`}
              />
            ))}
          </div>
        )}
      </MissionSection>

      {/* 2 — Executive KPIs */}
      <MissionSection title="Estado del negocio y la operación">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MissionMetricCard label="Pipeline" value={fmt(stats.pipelineValue)} icon={TrendingUp} accent="emerald" href={`${base}/opportunities`} />
          <MissionMetricCard label="Oportunidades abiertas" value={stats.openOpportunitiesCount} icon={Target} accent="blue" href={`${base}/opportunities`} />
          <MissionMetricCard label="Casos abiertos" value={caseStats?.openCount ?? "—"} icon={LifeBuoy} accent="orange" href={`${base}/cases`} />
          <MissionMetricCard label="Órdenes abiertas" value={woStats?.openCount ?? "—"} icon={Wrench} accent="orange" href={`${base}/work-orders`} />
          <MissionMetricCard label="Técnicos disponibles" value={dispatch?.availableTechnicians ?? "—"} icon={Users} accent="blue" href={`${base}/dispatch`} />
          <MissionMetricCard label="Utilización" value={dispatch?.averageUtilization != null ? `${dispatch.averageUtilization}%` : "—"} icon={Gauge} accent="silver" href={`${base}/dispatch`} />
        </div>
      </MissionSection>

      {/* 6 — Field Service snapshot */}
      {dispatch ? (
        <MissionSection
          title="Field Service"
          description="Operación de campo del día."
          href={`${base}/dashboard/field-service`}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MissionMetricCard label="Asignaciones hoy" value={dispatch.assignmentsToday} icon={Gauge} accent="blue" />
            <MissionMetricCard label="Disponibles" value={dispatch.availableTechnicians} icon={Users} accent="emerald" />
            <MissionMetricCard label="Ocupados" value={dispatch.busyTechnicians} icon={Users} accent="orange" />
            <MissionMetricCard label="Sobrecargados" value={dispatch.overloadedTechnicians} icon={Users} accent="orange" />
            <MissionMetricCard label="Utilización prom." value={dispatch.averageUtilization != null ? `${dispatch.averageUtilization}%` : "—"} icon={Gauge} accent="silver" />
          </div>
        </MissionSection>
      ) : null}

      {/* 4 — CRM snapshot */}
      {canCrm ? (
        <MissionSection title="CRM" description="Pipeline comercial." href={`${base}/dashboard/crm`}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
              <MissionMetricCard label="Pipeline" value={fmt(stats.pipelineValue)} icon={TrendingUp} accent="emerald" />
              <MissionMetricCard
                label="Conversión"
                value={revenue != null ? `${Math.round(revenue.winRate)}%` : "—"}
                icon={Target}
                accent="blue"
                hint="Won / (Won + Lost)"
              />
            </div>
            <div className="rounded-xl border bg-card p-4 lg:col-span-2">
              <p className="mb-2 text-sm font-medium text-foreground">Oportunidades recientes</p>
              {topOpps && topOpps.items.length > 0 ? (
                <ul className="divide-y">
                  {topOpps.items.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`${base}/opportunities/${o.id}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {o.name}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {o.companyName ?? "—"}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {o.estimatedValue != null ? fmt(o.estimatedValue) : "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground/60">
                  Sin oportunidades.
                </p>
              )}
            </div>
          </div>
        </MissionSection>
      ) : null}

      {/* 5 — Service snapshot */}
      {caseStats ? (
        <MissionSection title="Service" description="Servicio al cliente." href={`${base}/dashboard/service`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MissionMetricCard label="Casos abiertos" value={caseStats.openCount} icon={LifeBuoy} accent="orange" />
            <MissionMetricCard label="Resueltos" value={caseStats.byStatus.resolved} icon={LifeBuoy} accent="emerald" />
            <MissionMetricCard label="Cerrados" value={caseStats.byStatus.closed} icon={Cpu} accent="silver" />
            <MissionMetricCard
              label="SLA cumplido"
              value={caseStats.slaCompliancePct != null ? `${caseStats.slaCompliancePct}%` : "—"}
              icon={Gauge}
              accent="emerald"
            />
          </div>
        </MissionSection>
      ) : null}
    </div>
  )
}
