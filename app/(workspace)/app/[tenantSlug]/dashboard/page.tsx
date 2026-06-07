import {
  Building2,
  Contact,
  DollarSign,
  FileText,
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
import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getTenantDashboardStats } from "@/modules/crm/composition"
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

        {/* Activity feed — placeholder until activity queries are wired */}
        <ActivityFeed items={[]} />
      </div>
    </>
  )
}
