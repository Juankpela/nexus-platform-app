import { Building2, Contact, FileText, Target, TrendingUp } from "lucide-react"
import type { Metadata } from "next"

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { InsightBanner } from "@/components/dashboard/insight-banner"
import { DistributionBars } from "@/components/dashboard/distribution-bars"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { MiniGauge } from "@/components/dashboard/mini-gauge"
import { SummaryWidget } from "@/components/dashboard/summary-widget"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getTenantDashboardStats } from "@/modules/crm/composition"
import { getTenantRevenueMetrics } from "@/modules/forecasting/composition"
import { dashboardTabsFor } from "@/modules/platform/presentation/navigation"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Panel CRM" }

const STAGE_LABELS: Record<string, string> = {
  new: "Nuevas",
  discovery: "Discovery",
  proposal: "Propuesta",
  negotiation: "Negociación",
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  if (value === 0) return "$0"
  return `$${value.toLocaleString()}`
}

export default async function CrmDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.opportunitiesRead)

  const [stats, metrics] = await Promise.all([
    getTenantDashboardStats(context.tenantId),
    getTenantRevenueMetrics(context.tenantId, "all_time"),
  ])

  const tabs = dashboardTabsFor(tenantSlug, context.effectivePermissions)

  return (
    <>
      <PageHeader title="CRM" description="Pipeline comercial y conversión." />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <DashboardTabs tabs={tabs} />

        <InsightBanner
          level={Math.round(metrics.winRate) >= 50 ? "healthy" : "attention"}
          headline={Math.round(metrics.winRate) >= 50 ? "Pipeline saludable" : "Conversión por debajo del objetivo"}
          detail={`${stats.openOpportunitiesCount} oportunidades abiertas por ${fmt(stats.pipelineValue)} · conversión ${Math.round(metrics.winRate)}% · ${stats.quotesCount} cotizaciones activas.`}
          action={{ label: "Ver oportunidades", href: `/app/${tenantSlug}/opportunities` }}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Empresas" value={stats.companiesCount} icon={Building2} accent="blue" />
          <KpiCard label="Contactos" value={stats.contactsCount} icon={Contact} accent="silver" />
          <KpiCard label="Oportunidades abiertas" value={stats.openOpportunitiesCount} icon={Target} accent="blue" />
          <KpiCard label="Pipeline" value={fmt(stats.pipelineValue)} icon={TrendingUp} accent="emerald" hint="Valor activo" />
          <KpiCard label="Ingresos ganados" value={fmt(metrics.closedWonRevenue)} icon={TrendingUp} accent="emerald" />
          <KpiCard label="Cotizaciones" value={stats.quotesCount} icon={FileText} accent="silver" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DistributionBars
              title="Pipeline por etapa"
              icon={Target}
              format={fmt}
              rows={stats.pipelineByStage.map((s) => ({
                label: STAGE_LABELS[s.status] ?? s.label,
                value: s.value,
                tone: "blue",
              }))}
            />
          </div>
          <MiniGauge
            title="Tasa de conversión"
            pct={Math.round(metrics.winRate)}
            caption="Won / (Won + Lost)"
            size="lg"
          />
        </div>

        <SummaryWidget
          title="Resumen comercial"
          rows={[
            { label: "Cotizaciones", value: stats.quotesCount },
            { label: "Revenue esperado", value: fmt(metrics.expectedRevenue) },
            { label: "Revenue ponderado", value: fmt(metrics.weightedRevenue) },
            {
              label: "Ticket promedio",
              value: metrics.avgDealSize != null ? fmt(metrics.avgDealSize) : "—",
            },
          ]}
        />
      </div>
    </>
  )
}
