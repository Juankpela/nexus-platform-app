import {
  AlertTriangle,
  Building2,
  Contact,
  DollarSign,
  FileText,
  LifeBuoy,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react"
import type { Metadata } from "next"

import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { ChartContainer } from "@/components/dashboard/chart-container"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { SummaryWidget } from "@/components/dashboard/summary-widget"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getTenantDashboardStats } from "@/modules/crm/composition"
import { getTenantCaseStats } from "@/modules/service/composition"
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
} from "@/modules/service/domain/case"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Dashboard" }

/** Format a monetary value as $XK / $XM for KPI display. */
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  if (value === 0) return "$0"
  return `$${value.toLocaleString()}`
}

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: "Nuevas",
  discovery: "Discovery",
  proposal: "Propuesta",
  negotiation: "Negociación",
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.dashboardRead,
  )

  const stats = await getTenantDashboardStats(context.tenantId)

  const canReadCases = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.casesRead,
  )
  const caseStats = canReadCases
    ? await getTenantCaseStats(context.tenantId)
    : null

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Centro de operaciones — tu vista en tiempo real de ventas y servicio."
      />

      <div className="space-y-6 px-5 pb-10 sm:px-8">
        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Empresas"
            value={stats.companiesCount}
            icon={Building2}
            accent="blue"
          />
          <KpiCard
            label="Contactos"
            value={stats.contactsCount}
            icon={Contact}
            accent="silver"
          />
          <KpiCard
            label="Oportunidades abiertas"
            value={stats.openOpportunitiesCount}
            icon={Target}
            accent="blue"
          />
          <KpiCard
            label="Pipeline"
            value={formatCurrency(stats.pipelineValue)}
            icon={TrendingUp}
            accent="emerald"
            hint="Valor de oportunidades activas"
          />
          <KpiCard
            label="Cotizaciones"
            value={stats.quotesCount}
            icon={FileText}
            accent="orange"
          />
          <KpiCard
            label="Ingresos (ganadas)"
            value={formatCurrency(stats.wonRevenue)}
            icon={DollarSign}
            accent="emerald"
            hint="Suma de oportunidades Won"
          />
        </div>

        {/* Pipeline breakdown */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartContainer
              title="Pipeline por etapa"
              description="Valor de oportunidades distribuido en el pipeline de ventas."
            />
          </div>
          <SummaryWidget
            title="Resumen del pipeline"
            rows={stats.pipelineByStage.map((stage) => ({
              label: PIPELINE_STAGE_LABELS[stage.status] ?? stage.label,
              value:
                stage.count > 0
                  ? `${stage.count} · ${formatCurrency(stage.value)}`
                  : "—",
            }))}
          />
        </div>

        {/* Service / Cases */}
        {caseStats ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Servicio — Casos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Casos abiertos"
                value={caseStats.openCount}
                icon={LifeBuoy}
                accent="orange"
                hint={`${caseStats.totalCount} en total`}
              />
              <KpiCard
                label="Cumplimiento SLA"
                value={
                  caseStats.slaCompliancePct != null
                    ? `${caseStats.slaCompliancePct}%`
                    : "—"
                }
                icon={ShieldCheck}
                accent="emerald"
                hint="Casos dentro de SLA"
              />
              <KpiCard
                label="SLA incumplidos"
                value={caseStats.breachedCount}
                icon={AlertTriangle}
                accent="silver"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SummaryWidget
                title="Casos por estado"
                rows={CASE_STATUSES.map((s) => ({
                  label: CASE_STATUS_LABELS[s],
                  value: caseStats.byStatus[s],
                }))}
              />
              <SummaryWidget
                title="Casos por prioridad"
                rows={CASE_PRIORITIES.map((p) => ({
                  label: CASE_PRIORITY_LABELS[p],
                  value: caseStats.byPriority[p],
                }))}
              />
            </div>
          </div>
        ) : null}

        {/* Activity feed — placeholder until activity queries are wired */}
        <ActivityFeed items={[]} />
      </div>
    </>
  )
}
