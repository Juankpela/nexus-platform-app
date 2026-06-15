import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Gauge,
  LayoutGrid,
  Users,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AssignTechnicianDialog } from "@/components/dispatch/assign-technician-dialog"
import { AssignmentActions } from "@/components/dispatch/assignment-actions"
import { QuickAssignButton } from "@/components/dispatch/quick-assign-button"
import { AssignmentFormDialog } from "@/components/scheduling/assignment-form-dialog"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { RefreshBoardButton } from "@/components/dispatch/refresh-board-button"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTenantDispatchBoard,
  getTenantDispatchStats,
} from "@/modules/dispatch/composition"
import { selectUnassignedWorkOrders } from "@/modules/dispatch/application/select-unassigned"
import {
  WORKLOAD_STATUS_LABELS,
  type WorkloadStatus,
} from "@/modules/dispatch/domain/technician-workload"
import {
  findEligibleTechnicians,
  getActiveAssignmentsByWorkOrder,
} from "@/modules/scheduling/composition"
import {
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
} from "@/modules/scheduling/domain/work-order-assignment"
import { listTenantTechnicians, listTenantWorkOrders } from "@/modules/service/composition"
import {
  WORK_ORDER_PRIORITY_LABELS,
  type WorkOrder,
} from "@/modules/service/domain/work-order"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dispatch" }

const VALID_TABS = ["board", "stats"] as const
type Tab = (typeof VALID_TABS)[number]

const workloadStyles: Record<WorkloadStatus, { badge: string; bar: string }> = {
  overloaded: { badge: "bg-red-500/10 text-red-600 dark:text-red-400", bar: "bg-red-500" },
  busy: { badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  available: { badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  unavailable: { badge: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/40" },
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
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}
function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}
/** Assign window from the WO: its scheduled window, defaulting end to start + 1h. */
function woWindow(wo: WorkOrder): { start: string; end: string } | null {
  if (!wo.scheduledStart) return null
  const end = wo.scheduledEnd ?? new Date(new Date(wo.scheduledStart).getTime() + 3_600_000).toISOString()
  return { start: wo.scheduledStart, end }
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
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayLocal()
  const basePath = `/app/${tenantSlug}/dispatch`

  const canSchedule = hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.schedulingWrite)
  const canWoWrite = hasPermission(context.effectivePermissions, SERVICE_PERMISSIONS.workOrdersWrite)

  const [board, stats, allWos, technicianPage] = await Promise.all([
    getTenantDispatchBoard(context.tenantId, date),
    getTenantDispatchStats(context.tenantId, date),
    listTenantWorkOrders(
      context.tenantId,
      { search: null, status: null, priority: null, technicianId: null, companyId: null, assetId: null, dateFrom: null, dateTo: null },
      1,
      500,
    ),
    canSchedule
      ? listTenantTechnicians(context.tenantId, { search: null, status: "active" }, "name", 1, 200)
      : Promise.resolve(null),
  ])

  const technicians = (technicianPage?.items ?? []).map((t) => ({
    id: t.id,
    name: `${t.firstName} ${t.lastName}`.trim(),
  }))

  // Work orders that already have an active assignment (ADR-031).
  const activeMap = await getActiveAssignmentsByWorkOrder(
    context.tenantId,
    allWos.items.map((w) => w.id),
  )
  const assignedIds = new Set(activeMap.keys())
  const woById = new Map(allWos.items.map((w) => [w.id, w]))

  // Pending to assign = open WOs without an active assignment. Dated orders come
  // first (soonest required date), then orders with no scheduled window.
  const unassigned = selectUnassignedWorkOrders(allWos.items, assignedIds).sort((a, b) => {
    if (a.scheduledStart && b.scheduledStart) return a.scheduledStart < b.scheduledStart ? -1 : 1
    if (a.scheduledStart) return -1
    if (b.scheduledStart) return 1
    return 0
  })

  // Suggested technician per dated pending order, reusing its own window.
  // "El sistema recomienda. El usuario decide." Undated orders get no suggestion
  // (no window to evaluate or honor) — the user is routed to schedule them.
  const suggestionByWo = new Map(
    await Promise.all(
      unassigned.map(async (wo) => {
        const win = woWindow(wo)
        if (!win || !canSchedule) return [wo.id, null] as const
        const results = await findEligibleTechnicians(context.tenantId, {
          skillId: null,
          minLevel: null,
          zoneId: null,
          startsAt: win.start,
          endsAt: win.end,
        })
        const best = results.find((r) => r.eligible) ?? null
        return [wo.id, best] as const
      }),
    ),
  )

  const tabClass = (t: Tab) =>
    cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )

  return (
    <>
      <PageHeader
        title="Tablero de despacho"
        description="Tu día de operación: asigna, reasigna y avanza las órdenes."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={`${basePath}?date=${date}`} className={tabClass("board")}>
              <LayoutGrid className="size-3.5" /> Tablero
            </Link>
            <Link href={`${basePath}?tab=stats&date=${date}`} className={tabClass("stats")}>
              Métricas
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <form action={basePath} className="flex items-center gap-2">
              {tab === "stats" ? <input type="hidden" name="tab" value="stats" /> : null}
              <Input type="date" name="date" defaultValue={date} className="w-40" />
              <Button type="submit" variant="outline" size="sm">Ver</Button>
            </form>
            <RefreshBoardButton tenantSlug={tenantSlug} />
          </div>
        </div>

        {tab === "stats" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Asignaciones del día" value={stats.assignmentsToday} icon={LayoutGrid} accent="blue" />
            <KpiCard label="Técnicos activos" value={stats.activeTechnicians} icon={Users} accent="blue" />
            <KpiCard label="Disponibles" value={stats.availableTechnicians} icon={CheckCircle2} accent="emerald" />
            <KpiCard label="Ocupados" value={stats.busyTechnicians} icon={Gauge} accent="orange" />
            <KpiCard label="Sobrecargados" value={stats.overloadedTechnicians} icon={AlertTriangle} accent="orange" />
            <KpiCard label="Utilización promedio" value={stats.averageUtilization != null ? `${stats.averageUtilization}%` : "—"} icon={Gauge} accent="silver" />
          </div>
        ) : (
          <>
            {/* Pendientes de asignar — prioridad visual */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">Pendientes de asignar</h2>
                <span className="text-xs text-muted-foreground">{unassigned.length} orden(es)</span>
              </div>
              {unassigned.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Todo está asignado. 🎉</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {unassigned.map((wo) => {
                    const win = woWindow(wo)
                    const suggested = suggestionByWo.get(wo.id) ?? null
                    return (
                      <li
                        key={wo.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-2 text-sm"
                      >
                        <Link href={`/app/${tenantSlug}/work-orders/${wo.id}`} className="flex flex-1 flex-wrap items-center gap-2 hover:underline">
                          <span className="font-medium text-foreground">{wo.workOrderNumber}</span>
                          <span className="text-muted-foreground">{wo.subject}</span>
                          {wo.companyName ? <span className="text-xs text-muted-foreground/70">{wo.companyName}</span> : null}
                          {win ? (
                            <span className="text-xs tabular-nums text-muted-foreground/70">{fmtDateTime(win.start)}</span>
                          ) : (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">Sin fecha</span>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{WORK_ORDER_PRIORITY_LABELS[wo.priority]}</span>
                        </Link>
                        {canSchedule && win ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {suggested ? (
                              <QuickAssignButton
                                tenantSlug={tenantSlug}
                                workOrderId={wo.id}
                                technicianId={suggested.technicianId}
                                technicianName={suggested.technicianName}
                                scheduledStart={win.start}
                                scheduledEnd={win.end}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground/70">Sin técnico sugerido</span>
                            )}
                            <AssignTechnicianDialog
                              mode="assign"
                              tenantSlug={tenantSlug}
                              targetId={wo.id}
                              scheduledStart={win.start}
                              scheduledEnd={win.end}
                              technicians={technicians}
                              triggerLabel="Otro técnico"
                              triggerVariant="ghost"
                            />
                          </div>
                        ) : canSchedule && !win ? (
                          <AssignmentFormDialog
                            tenantSlug={tenantSlug}
                            lockedWorkOrder={{
                              id: wo.id,
                              label: `${wo.workOrderNumber} · ${wo.subject}`,
                            }}
                            technicianOptions={technicians.map((t) => ({ id: t.id, label: t.name }))}
                            trigger={
                              <Button type="button" variant="outline" size="sm">
                                <CalendarPlus className="size-4" />
                                Programar y asignar
                              </Button>
                            }
                          />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Técnicos y su carga del día */}
            {board.entries.length === 0 ? (
              <EmptyState title="Sin técnicos" description="Registra técnicos para ver su carga en el tablero." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {board.entries.map((entry) => {
                  const w = entry.workload
                  const style = workloadStyles[w.status]
                  return (
                    <div key={w.technicianId} className="rounded-xl border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{w.technicianName}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.assignmentCount} órdenes · {fmtHours(w.scheduledMinutes)} programadas
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
                          {WORKLOAD_STATUS_LABELS[w.status]}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Utilización</span>
                          <span className="font-semibold tabular-nums text-foreground">{w.utilizationPercent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.min(100, w.utilizationPercent)}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Capacidad restante: {fmtHours(w.availableMinutes)}</p>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        {entry.assignments.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70">Sin órdenes asignadas hoy.</p>
                        ) : (
                          entry.assignments.map((a) => (
                            <div key={a.id} className="rounded-lg border bg-muted/20 px-2.5 py-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Link href={`/app/${tenantSlug}/work-orders/${a.workOrderId}`} className="flex flex-wrap items-center gap-2 hover:underline">
                                  <span className="font-medium text-foreground">{a.workOrderNumber}</span>
                                  <span className="tabular-nums text-muted-foreground">{fmtTime(a.scheduledStart)}–{fmtTime(a.scheduledEnd)}</span>
                                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${assignmentStyles[a.status]}`}>
                                    {ASSIGNMENT_STATUS_LABELS[a.status]}
                                  </span>
                                </Link>
                                {canSchedule ? (
                                  <AssignmentActions
                                    tenantSlug={tenantSlug}
                                    assignmentId={a.id}
                                    workOrderId={a.workOrderId}
                                    scheduledStart={a.scheduledStart}
                                    scheduledEnd={a.scheduledEnd}
                                    currentTechnicianId={a.technicianId}
                                    technicians={technicians}
                                    workOrderStatus={canWoWrite ? woById.get(a.workOrderId)?.status : undefined}
                                  />
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
