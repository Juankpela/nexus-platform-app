import { AlertTriangle, CheckCircle2, Cpu, LifeBuoy, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { SummaryWidget } from "@/components/dashboard/summary-widget"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTenantCaseStats,
  listTenantAssets,
} from "@/modules/service/composition"
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
} from "@/modules/service/domain/case"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Panel de servicio" }

export default async function ServiceDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.casesRead)

  const canReadAssets = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.assetsRead,
  )

  const [caseStats, assetResult] = await Promise.all([
    getTenantCaseStats(context.tenantId),
    canReadAssets
      ? listTenantAssets(
          context.tenantId,
          { search: null, status: null, category: null, criticality: null, companyId: null },
          1,
          1,
        )
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
  ])

  const closed = caseStats.byStatus.closed
  const resolved = caseStats.byStatus.resolved

  return (
    <>
      <PageHeader title="Dashboard Service" description="Casos, SLA y activos." />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Casos abiertos" value={caseStats.openCount} icon={LifeBuoy} accent="orange" hint={`${caseStats.totalCount} en total`} />
          <KpiCard label="Resueltos" value={resolved} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="Cerrados" value={closed} icon={CheckCircle2} accent="silver" />
          <KpiCard
            label="Cumplimiento SLA"
            value={caseStats.slaCompliancePct != null ? `${caseStats.slaCompliancePct}%` : "—"}
            icon={ShieldCheck}
            accent="emerald"
          />
          <KpiCard label="SLA incumplidos" value={caseStats.breachedCount} icon={AlertTriangle} accent="orange" />
          <KpiCard label="Activos" value={canReadAssets ? assetResult.total : "—"} icon={Cpu} accent="blue" />
        </div>

        <SummaryWidget
          title="Casos por estado"
          rows={CASE_STATUSES.map((s) => ({
            label: CASE_STATUS_LABELS[s],
            value: caseStats.byStatus[s],
          }))}
        />
      </div>
    </>
  )
}
