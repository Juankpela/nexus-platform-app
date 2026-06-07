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
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Dashboard" }

// Visual foundation for the executive dashboard. KPI values are placeholders
// ("—") — analytics wiring is intentionally deferred to a later sprint.
const KPIS = [
  { label: "Companies", icon: Building2, accent: "blue" as const },
  { label: "Contacts", icon: Contact, accent: "silver" as const },
  { label: "Open Opportunities", icon: Target, accent: "blue" as const },
  { label: "Pipeline Value", icon: TrendingUp, accent: "emerald" as const },
  { label: "Quotes", icon: FileText, accent: "orange" as const },
  { label: "Revenue", icon: DollarSign, accent: "emerald" as const },
]

const PIPELINE_STAGES = [
  "New",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
]

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

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Operations command center — your live view across sales and service."
      />

      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KPIS.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value="—"
              icon={kpi.icon}
              accent={kpi.accent}
              hint="Live metric coming soon"
            />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartContainer
              title="Pipeline by stage"
              description="Opportunity value distributed across the sales pipeline."
            />
          </div>
          <SummaryWidget
            title="Pipeline summary"
            rows={PIPELINE_STAGES.map((stage) => ({ label: stage, value: "—" }))}
          />
        </div>

        <ActivityFeed items={[]} />
      </div>
    </>
  )
}
