import { CalendarDays, Gauge, LayoutList, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  filterAssignments,
  groupByHour,
  groupByTechnician,
  groupByWeekday,
  startOfWeekUtc,
} from "@/modules/calendar/application/calendar-grouping"
import { getTenantDispatchStats } from "@/modules/dispatch/composition"
import { listTenantAssignments } from "@/modules/scheduling/composition"
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
  type WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import { listTenantTechnicians } from "@/modules/service/composition"
import { technicianFullName } from "@/modules/service/domain/technician"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Calendar" }

const VALID_TABS = ["day", "week", "technician"] as const
type Tab = (typeof VALID_TABS)[number]

const statusStyles: Record<AssignmentStatus, string> = {
  scheduled: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
}

function parseTab(v?: string): Tab {
  return (VALID_TABS as readonly string[]).includes(v ?? "") ? (v as Tab) : "day"
}
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}

function AssignmentChip({
  a,
  tenantSlug,
  showTechnician = true,
}: {
  a: WorkOrderAssignment
  tenantSlug: string
  showTechnician?: boolean
}) {
  return (
    <Link
      href={`/app/${tenantSlug}/schedule/${a.id}`}
      className={cn(
        "block rounded-lg border px-2.5 py-1.5 text-xs transition-colors hover:brightness-105",
        statusStyles[a.status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{a.workOrderNumber}</span>
        <span className="tabular-nums opacity-80">
          {fmtTime(a.scheduledStart)}–{fmtTime(a.scheduledEnd)}
        </span>
      </div>
      {showTechnician && a.technicianName ? (
        <p className="mt-0.5 truncate opacity-80">{a.technicianName}</p>
      ) : null}
      <p className="mt-0.5 opacity-70">
        {ASSIGNMENT_STATUS_LABELS[a.status]} · {a.estimatedDurationMinutes} min
      </p>
    </Link>
  )
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    tab?: string
    date?: string
    technician?: string
    status?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.schedulingRead)

  const canReadDispatch = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.dispatchRead,
  )

  const tab = parseTab(sp.tab)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayUtc()
  const technicianId = sp.technician?.trim() ? sp.technician.trim() : null
  const status = (ASSIGNMENT_STATUSES as string[]).includes(sp.status ?? "")
    ? (sp.status as AssignmentStatus)
    : null
  const basePath = `/app/${tenantSlug}/calendar`

  // Window: day view = 1 day; week & technician views = Mon–Sun week.
  const weekStart = startOfWeekUtc(date)
  const windowFrom =
    tab === "day" ? new Date(`${date}T00:00:00.000Z`) : weekStart
  const windowTo =
    tab === "day"
      ? new Date(windowFrom.getTime() + 86_400_000)
      : new Date(weekStart.getTime() + 7 * 86_400_000)

  const [assignmentResult, techResult, dispatchStats, weekCount] = await Promise.all([
    listTenantAssignments(
      context.tenantId,
      {
        technicianId,
        status,
        dateFrom: windowFrom.toISOString(),
        dateTo: windowTo.toISOString(),
      },
      1,
      500,
    ),
    listTenantTechnicians(
      context.tenantId,
      { search: null, status: "active" },
      "name",
      1,
      200,
    ),
    canReadDispatch
      ? getTenantDispatchStats(context.tenantId, todayUtc())
      : Promise.resolve(null),
    listTenantAssignments(
      context.tenantId,
      {
        technicianId: null,
        status: null,
        dateFrom: startOfWeekUtc(todayUtc()).toISOString(),
        dateTo: new Date(
          startOfWeekUtc(todayUtc()).getTime() + 7 * 86_400_000,
        ).toISOString(),
      },
      1,
      1,
    ),
  ])

  const assignments = assignmentResult.items
  const technicianOptions = techResult.items.map((t) => ({
    id: t.id,
    label: technicianFullName(t),
  }))

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  const tabClass = (t: Tab) =>
    cn(
      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      tab === t
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    )

  function tabHref(t: Tab) {
    const p = new URLSearchParams()
    p.set("tab", t)
    p.set("date", date)
    if (technicianId) p.set("technician", technicianId)
    if (status) p.set("status", status)
    return `${basePath}?${p.toString()}`
  }

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Visualización de asignaciones de Field Service en el tiempo."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        {/* Metrics (reuses Dispatch stats) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Asignaciones hoy"
            value={dispatchStats?.assignmentsToday ?? "—"}
            icon={CalendarDays}
            accent="blue"
          />
          <KpiCard
            label="Asignaciones esta semana"
            value={weekCount.total}
            icon={LayoutList}
            accent="blue"
          />
          <KpiCard
            label="Técnicos disponibles"
            value={dispatchStats?.availableTechnicians ?? "—"}
            icon={Users}
            accent="emerald"
          />
          <KpiCard
            label="Utilización promedio"
            value={
              dispatchStats?.averageUtilization != null
                ? `${dispatchStats.averageUtilization}%`
                : "—"
            }
            icon={Gauge}
            accent="silver"
          />
        </div>

        {/* Tabs + filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={tabHref("day")} className={tabClass("day")}>
              Día
            </Link>
            <Link href={tabHref("week")} className={tabClass("week")}>
              Semana
            </Link>
            <Link href={tabHref("technician")} className={tabClass("technician")}>
              Técnico
            </Link>
          </div>

          <form action={basePath} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="tab" value={tab} />
            <Input type="date" name="date" defaultValue={date} className="w-40" />
            <select name="technician" defaultValue={technicianId ?? ""} className={selectClass}>
              <option value="">Todos los técnicos</option>
              {technicianOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status ?? ""} className={selectClass}>
              <option value="">Todos los estados</option>
              {ASSIGNMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ASSIGNMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Ver
            </Button>
          </form>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="Sin asignaciones"
            description="No hay asignaciones en el período seleccionado."
          />
        ) : tab === "day" ? (
          <DayView assignments={assignments} tenantSlug={tenantSlug} />
        ) : tab === "week" ? (
          <WeekView
            assignments={assignments}
            weekStart={weekStart}
            tenantSlug={tenantSlug}
          />
        ) : (
          <TechnicianView assignments={assignments} tenantSlug={tenantSlug} />
        )}
      </div>
    </>
  )
}

function DayView({
  assignments,
  tenantSlug,
}: {
  assignments: WorkOrderAssignment[]
  tenantSlug: string
}) {
  const buckets = groupByHour(filterAssignments(assignments, {}))
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {buckets.map((b) => (
        <div key={b.hour} className="flex gap-3 border-b px-4 py-2 last:border-b-0">
          <div className="w-14 shrink-0 pt-1 text-xs font-medium tabular-nums text-muted-foreground">
            {String(b.hour).padStart(2, "0")}:00
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {b.items.length === 0 ? (
              <span className="py-1 text-xs text-muted-foreground/40">—</span>
            ) : (
              b.items.map((a) => (
                <div key={a.id} className="w-64">
                  <AssignmentChip a={a} tenantSlug={tenantSlug} />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function WeekView({
  assignments,
  weekStart,
  tenantSlug,
}: {
  assignments: WorkOrderAssignment[]
  weekStart: Date
  tenantSlug: string
}) {
  const buckets = groupByWeekday(assignments, weekStart)
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
      {buckets.map((b) => (
        <div key={b.date} className="flex flex-col rounded-xl border bg-card">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold text-foreground">{b.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {b.date} · {b.items.length}
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {b.items.length === 0 ? (
              <span className="py-4 text-center text-xs text-muted-foreground/40">
                Sin asignaciones
              </span>
            ) : (
              b.items.map((a) => (
                <AssignmentChip key={a.id} a={a} tenantSlug={tenantSlug} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TechnicianView({
  assignments,
  tenantSlug,
}: {
  assignments: WorkOrderAssignment[]
  tenantSlug: string
}) {
  const groups = groupByTechnician(assignments)
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <div key={g.technicianId} className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="font-semibold text-foreground">{g.technicianName}</p>
            <span className="text-xs text-muted-foreground">
              {g.items.length} asignaciones
            </span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {g.items.map((a) => (
              <AssignmentChip
                key={a.id}
                a={a}
                tenantSlug={tenantSlug}
                showTechnician={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
