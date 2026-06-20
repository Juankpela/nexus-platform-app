import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  LayoutGrid,
  Timer,
  Users,
  Wrench,
} from "lucide-react"
import type { Metadata } from "next"

import { KpiCard } from "@/components/dashboard/kpi-card"
import { SummaryWidget } from "@/components/dashboard/summary-widget"
import { PageHeader } from "@/components/layout/page-header"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getTenantWorkOrderStats } from "@/modules/service/composition"
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
} from "@/modules/service/domain/work-order"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Panel de servicio de campo" }

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function FieldServiceDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const canReadWorkOrders = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersRead,
  )

  const [dispatch, woStats] = await Promise.all([
    getTenantDispatchStats(context.tenantId, todayUtc()),
    canReadWorkOrders
      ? getTenantWorkOrderStats(context.tenantId)
      : Promise.resolve(null),
  ])

  return (
    <>
      <PageHeader
        title="Dashboard Field Service"
        description="Operación diaria — carga, disponibilidad y utilización."
      />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Asignaciones hoy" value={dispatch.assignmentsToday} icon={LayoutGrid} accent="blue" />
          <KpiCard label="Técnicos activos" value={dispatch.activeTechnicians} icon={Users} accent="blue" />
          <KpiCard label="Disponibles" value={dispatch.availableTechnicians} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="Ocupados" value={dispatch.busyTechnicians} icon={Gauge} accent="orange" />
          <KpiCard label="Sobrecargados" value={dispatch.overloadedTechnicians} icon={AlertTriangle} accent="orange" />
          <KpiCard
            label="Utilización promedio"
            value={dispatch.averageUtilization != null ? `${dispatch.averageUtilization}%` : "—"}
            icon={Gauge}
            accent="silver"
          />
        </div>

        {woStats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard label="Órdenes abiertas" value={woStats.openCount} icon={Wrench} accent="orange" hint={`${woStats.totalCount} en total`} />
              <KpiCard label="Completadas (mes)" value={woStats.completedThisMonth} icon={CheckCircle2} accent="emerald" />
              <KpiCard
                label="Tiempo prom. resolución"
                value={woStats.avgResolutionHours != null ? `${woStats.avgResolutionHours} h` : "—"}
                icon={Timer}
                accent="blue"
              />
            </div>
            <SummaryWidget
              title="Órdenes por estado"
              rows={WORK_ORDER_STATUSES.map((s) => ({
                label: WORK_ORDER_STATUS_LABELS[s],
                value: woStats.byStatus[s],
              }))}
            />
          </>
        ) : null}
      </div>
    </>
  )
}
