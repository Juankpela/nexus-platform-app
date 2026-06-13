import {
  CheckCircle2,
  Gauge,
  LayoutGrid,
  Users,
  AlertTriangle,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { RefreshBoardButton } from "@/components/dispatch/refresh-board-button"
import { SlaAlertsCard } from "@/components/dispatch/sla-alerts-card"
import { RescheduleProposalsCard } from "@/components/scheduling/reschedule-proposals-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTenantDispatchBoard,
  getTenantDispatchStats,
} from "@/modules/dispatch/composition"
import {
  getTenantSlaAlerts,
  listRecentRescheduleProposals,
} from "@/modules/scheduling/composition"
import {
  WORKLOAD_STATUS_LABELS,
  type WorkloadStatus,
} from "@/modules/dispatch/domain/technician-workload"
import {
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
} from "@/modules/scheduling/domain/work-order-assignment"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dispatch" }

const VALID_TABS = ["board", "stats"] as const
type Tab = (typeof VALID_TABS)[number]

const workloadStyles: Record<WorkloadStatus, { badge: string; bar: string }> = {
  overloaded: {
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-500",
  },
  busy: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  available: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  unavailable: {
    badge: "bg-muted text-muted-foreground",
    bar: "bg-muted-foreground/40",
  },
}

const assignmentStyles: Record<AssignmentStatus, string> = {
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseTab(v?: string): Tab {
  return (VALID_TABS as readonly string[]).includes(v ?? "") ? (v as Tab) : "board"
}
function fmtHours(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function DispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ tab?: string; date?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.dispatchRead)

  const tab = parseTab(sp.tab)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayUtc()
  const basePath = `/app/${tenantSlug}/dispatch`

  const canReadAudit = hasPermission(
    context.effectivePermissions,
    FOUNDATION_PERMISSIONS.auditRead,
  )
  const [board, stats, slaAlerts, proposals] = await Promise.all([
    getTenantDispatchBoard(context.tenantId, date),
    getTenantDispatchStats(context.tenantId, date),
    getTenantSlaAlerts(context.tenantId),
    canReadAudit
      ? listRecentRescheduleProposals(context.tenantId)
      : Promise.resolve([]),
  ])

  const tabClass = (t: Tab) =>
    cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      tab === t
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )

  return (
    <>
      <PageHeader
        title="Tablero de despacho"
        description="Operación diaria de Field Service — carga y disponibilidad por técnico."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={`${basePath}?date=${date}`} className={tabClass("board")}>
              <LayoutGrid className="size-3.5" /> Board
            </Link>
            <Link
              href={`${basePath}?tab=stats&date=${date}`}
              className={tabClass("stats")}
            >
              Stats
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <form action={basePath} className="flex items-center gap-2">
              {tab === "stats" ? (
                <input type="hidden" name="tab" value="stats" />
              ) : null}
              <Input
                type="date"
                name="date"
                defaultValue={date}
                className="w-40"
              />
              <Button type="submit" variant="outline" size="sm">
                Ver
              </Button>
            </form>
            <RefreshBoardButton tenantSlug={tenantSlug} />
          </div>
        </div>

        <SlaAlertsCard board={slaAlerts} tenantSlug={tenantSlug} />

        {canReadAudit ? (
          <RescheduleProposalsCard proposals={proposals} tenantSlug={tenantSlug} />
        ) : null}

        {tab === "stats" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Asignaciones del día" value={stats.assignmentsToday} icon={LayoutGrid} accent="blue" />
            <KpiCard label="Técnicos activos" value={stats.activeTechnicians} icon={Users} accent="blue" />
            <KpiCard label="Disponibles" value={stats.availableTechnicians} icon={CheckCircle2} accent="emerald" />
            <KpiCard label="Ocupados" value={stats.busyTechnicians} icon={Gauge} accent="orange" />
            <KpiCard label="Sobrecargados" value={stats.overloadedTechnicians} icon={AlertTriangle} accent="orange" />
            <KpiCard
              label="Utilización promedio"
              value={stats.averageUtilization != null ? `${stats.averageUtilization}%` : "—"}
              icon={Gauge}
              accent="silver"
            />
          </div>
        ) : board.entries.length === 0 ? (
          <EmptyState
            title="Sin técnicos"
            description="Registra técnicos para ver su carga en el tablero."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {board.entries.map((entry) => {
              const w = entry.workload
              const style = workloadStyles[w.status]
              return (
                <div key={w.technicianId} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {w.technicianName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {w.assignmentCount} órdenes · {fmtHours(w.scheduledMinutes)} programadas
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}
                    >
                      {WORKLOAD_STATUS_LABELS[w.status]}
                    </span>
                  </div>

                  {/* Utilization bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Utilización</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {w.utilizationPercent}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", style.bar)}
                        style={{ width: `${Math.min(100, w.utilizationPercent)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Capacidad restante: {fmtHours(w.availableMinutes)}
                    </p>
                  </div>

                  {/* Day's work orders */}
                  <div className="mt-3 space-y-1.5">
                    {entry.assignments.length === 0 ? (
                      <p className="text-xs text-muted-foreground/70">
                        Sin órdenes asignadas hoy.
                      </p>
                    ) : (
                      entry.assignments.map((a) => (
                        <Link
                          key={a.id}
                          href={`/app/${tenantSlug}/schedule/${a.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs hover:bg-muted/40"
                        >
                          <span className="font-medium text-foreground">
                            {a.workOrderNumber}
                          </span>
                          <span className="text-muted-foreground">
                            {fmtTime(a.scheduledStart)}–{fmtTime(a.scheduledEnd)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${assignmentStyles[a.status]}`}
                          >
                            {ASSIGNMENT_STATUS_LABELS[a.status]}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
