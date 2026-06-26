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
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { getTenantWorkOrderStats } from "@/modules/service/composition"
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import { dashboardTabsFor } from "@/modules/platform/presentation/navigation"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Panel de servicio de campo" }

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

const WO_TONE: Record<WorkOrderStatus, DistRow["tone"]> = {
  new: "silver",
  scheduled: "blue",
  dispatched: "blue",
  in_progress: "blue",
  on_hold: "orange",
  completed: "emerald",
  cancelled: "silver",
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
    canReadWorkOrders ? getTenantWorkOrderStats(context.tenantId) : Promise.resolve(null),
  ])

  const tabs = dashboardTabsFor(tenantSlug, context.effectivePermissions)

  return (
    <>
      <PageHeader
        title="Servicio de campo"
        description="Operación diaria — carga, disponibilidad y utilización."
      />
      <div className="space-y-6 px-5 pb-10 sm:px-8">
        <DashboardTabs tabs={tabs} />

        <InsightBanner
          level={dispatch.overloadedTechnicians > 0 ? "attention" : "healthy"}
          headline={dispatch.overloadedTechnicians > 0 ? "Atención requerida" : "Capacidad saludable"}
          detail={
            dispatch.overloadedTechnicians > 0
              ? `${dispatch.overloadedTechnicians} técnicos sobrecargados y ${dispatch.availableTechnicians} disponibles · utilización ${dispatch.averageUtilization ?? "—"}%. Rebalancea la carga${woStats ? `; ${woStats.openCount} órdenes abiertas por asignar` : ""}.`
              : `Utilización ${dispatch.averageUtilization ?? "—"}%, ${dispatch.availableTechnicians} técnicos disponibles. Sin sobrecargas.`
          }
          action={{ label: "Ver fuerza de campo", href: `/app/${tenantSlug}/field-monitor` }}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard label="Asignaciones hoy" value={dispatch.assignmentsToday} icon={LayoutGrid} accent="blue" />
          <KpiCard label="Técnicos activos" value={dispatch.activeTechnicians} icon={Users} accent="blue" />
          <KpiCard label="Disponibles" value={dispatch.availableTechnicians} icon={CheckCircle2} accent="emerald" />
          <KpiCard label="Ocupados" value={dispatch.busyTechnicians} icon={Gauge} accent="orange" />
          <KpiCard label="Sobrecargados" value={dispatch.overloadedTechnicians} icon={AlertTriangle} accent="orange" />
          {woStats ? (
            <KpiCard label="Órdenes abiertas" value={woStats.openCount} icon={Wrench} accent="orange" hint={`${woStats.totalCount} en total`} />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {woStats ? (
            <DistributionBars
              title="Órdenes por estado"
              icon={Wrench}
              rows={WORK_ORDER_STATUSES.map((s) => ({
                label: WORK_ORDER_STATUS_LABELS[s],
                value: woStats.byStatus[s],
                tone: WO_TONE[s],
              }))}
            />
          ) : null}
          <MiniGauge title="Utilización promedio" pct={dispatch.averageUtilization} caption="Capacidad usada hoy" variant="neutral" size="lg" />
          {woStats ? (
            <div className="flex flex-col justify-center rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-nexus-blue/10 text-nexus-blue"><Timer className="size-4" /></span>
                <h3 className="text-sm font-semibold text-foreground">Tiempo prom. de resolución</h3>
              </div>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">
                {woStats.avgResolutionHours != null ? `${woStats.avgResolutionHours} h` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {woStats.completedThisMonth} completadas este mes
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
