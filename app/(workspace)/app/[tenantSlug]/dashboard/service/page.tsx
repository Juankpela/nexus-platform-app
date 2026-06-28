import { AlertTriangle, CheckCircle2, Cpu, Flame, LifeBuoy } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { InsightBanner } from "@/components/dashboard/insight-banner"
import { DistributionBars, type DistRow } from "@/components/dashboard/distribution-bars"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { MiniGauge } from "@/components/dashboard/mini-gauge"
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
  type CaseStatus,
} from "@/modules/service/domain/case"
import { dashboardTabsFor } from "@/modules/platform/presentation/navigation"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Panel de servicio" }

const CASE_TONE: Record<CaseStatus, DistRow["tone"]> = {
  new: "silver",
  working: "blue",
  waiting_customer: "orange",
  escalated: "red",
  resolved: "emerald",
  closed: "silver",
}

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

  const tabs = dashboardTabsFor(tenantSlug, context.effectivePermissions)

  return (
    <>
      <PageHeader title="Servicio" description="Casos, SLA y activos." />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <DashboardTabs tabs={tabs} />

        <InsightBanner
          level={
            caseStats.slaCompliancePct == null
              ? "healthy"
              : caseStats.slaCompliancePct >= 90
                ? "healthy"
                : caseStats.slaCompliancePct >= 75
                  ? "attention"
                  : "risk"
          }
          headline={
            caseStats.slaCompliancePct != null && caseStats.slaCompliancePct < 90
              ? "SLA requiere atención"
              : "SLA saludable"
          }
          detail={`Cumplimiento ${caseStats.slaCompliancePct ?? "—"}%${caseStats.openBreachedCount > 0 ? `, ${caseStats.openBreachedCount} vencido(s) por resolver` : ""} · ${caseStats.openCount} casos abiertos${caseStats.byStatus.escalated > 0 ? `, ${caseStats.byStatus.escalated} escalado(s)` : ""}.`}
          action={
            caseStats.openBreachedCount > 0
              ? { label: "Resolver SLA vencidos", href: `/app/${tenantSlug}/cases?sla=overdue` }
              : { label: "Ver casos", href: `/app/${tenantSlug}/cases` }
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Casos abiertos" value={caseStats.openCount} icon={LifeBuoy} accent="orange" hint={`${caseStats.totalCount} en total`} />
          <KpiCard label="Resueltos" value={caseStats.byStatus.resolved} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="Cerrados" value={caseStats.byStatus.closed} icon={CheckCircle2} accent="silver" />
          <KpiCard label="Escalados" value={caseStats.byStatus.escalated} icon={Flame} accent="orange" />
          <Link href={`/app/${tenantSlug}/cases?sla=overdue`} className="block">
            <KpiCard label="SLA vencidos" value={caseStats.openBreachedCount} icon={AlertTriangle} accent="orange" hint="Click para resolver" />
          </Link>
          <KpiCard label="Activos" value={canReadAssets ? assetResult.total : "—"} icon={Cpu} accent="blue" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DistributionBars
              title="Casos por estado"
              icon={LifeBuoy}
              rows={CASE_STATUSES.map((s) => ({
                label: CASE_STATUS_LABELS[s],
                value: caseStats.byStatus[s],
                tone: CASE_TONE[s],
              }))}
            />
          </div>
          <MiniGauge
            title="Cumplimiento SLA"
            pct={caseStats.slaCompliancePct}
            caption="Casos dentro de SLA"
            size="lg"
          />
        </div>
      </div>
    </>
  )
}
