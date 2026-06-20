import { CalendarClock, CheckCircle2, ListChecks, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { AssignmentFormDialog } from "@/components/scheduling/assignment-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTenantSchedulingStats,
  listTenantAssignments,
} from "@/modules/scheduling/composition"
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentStatus,
} from "@/modules/scheduling/domain/work-order-assignment"
import {
  listTenantTechnicians,
  listTenantWorkOrders,
} from "@/modules/service/composition"
import { technicianFullName } from "@/modules/service/domain/technician"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Agenda" }

const PAGE_SIZE = 10
const VALID_TABS = ["assignments", "stats"] as const
type Tab = (typeof VALID_TABS)[number]

const statusStyles: Record<AssignmentStatus, string> = {
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseTab(v?: string): Tab {
  return (VALID_TABS as readonly string[]).includes(v ?? "")
    ? (v as Tab)
    : "assignments"
}
function parseStatus(v?: string): AssignmentStatus | null {
  return (ASSIGNMENT_STATUSES as string[]).includes(v ?? "")
    ? (v as AssignmentStatus)
    : null
}
function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  })
}

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    tab?: string
    technician?: string
    status?: string
    from?: string
    to?: string
    page?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.schedulingRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.schedulingWrite,
  )

  const tab = parseTab(sp.tab)
  const technicianId = sp.technician?.trim() ? sp.technician.trim() : null
  const status = parseStatus(sp.status)
  const dateFrom = sp.from?.trim() ? sp.from.trim() : null
  const dateTo = sp.to?.trim() ? sp.to.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/schedule`

  const [result, stats, techResult, woResult] = await Promise.all([
    listTenantAssignments(
      context.tenantId,
      { technicianId, status, dateFrom, dateTo },
      page,
      PAGE_SIZE,
    ),
    getTenantSchedulingStats(context.tenantId),
    listTenantTechnicians(
      context.tenantId,
      { search: null, status: "active" },
      "name",
      1,
      200,
    ),
    canWrite
      ? listTenantWorkOrders(
          context.tenantId,
          {
            search: null,
            status: null,
            priority: null,
            technicianId: null,
            companyId: null,
            assetId: null,
            dateFrom: null,
            dateTo: null,
          },
          1,
          200,
        )
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
  ])

  const technicianOptions = techResult.items.map((t) => ({
    id: t.id,
    label: technicianFullName(t),
  }))
  const technicianLabels = new Map(technicianOptions.map((t) => [t.id, t.label]))
  const workOrderOptions = woResult.items
    .filter((w) => w.status !== "completed" && w.status !== "cancelled")
    .map((w) => ({ id: w.id, label: `${w.workOrderNumber} · ${w.subject}` }))

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

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
        title="Agenda"
        description="Asignaciones de órdenes de trabajo a técnicos."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={basePath} className={tabClass("assignments")}>
              <ListChecks className="size-3.5" /> Asignaciones
            </Link>
            <Link href={`${basePath}?tab=stats`} className={tabClass("stats")}>
              Stats
            </Link>
          </div>

          {canWrite ? (
            <AssignmentFormDialog
              tenantSlug={tenantSlug}
              workOrderOptions={workOrderOptions}
              technicianOptions={technicianOptions}
              trigger={
                <Button>
                  <Plus />
                  Asignar
                </Button>
              }
            />
          ) : null}
        </div>

        {tab === "stats" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Hoy" value={stats.assignmentsToday} icon={CalendarClock} accent="blue" />
            <KpiCard label="Esta semana" value={stats.assignmentsThisWeek} icon={CalendarClock} accent="blue" />
            <KpiCard label="Activas" value={stats.activeAssignments} icon={ListChecks} accent="orange" />
            <KpiCard label="Completadas" value={stats.completedAssignments} icon={CheckCircle2} accent="emerald" />
            <KpiCard
              label="Tasa de utilización"
              value={stats.utilizationRate != null ? `${stats.utilizationRate}%` : "—"}
              icon={CheckCircle2}
              accent="silver"
              hint="Completadas sobre el total"
            />
          </div>
        ) : (
          <>
            <form action={basePath} className="flex flex-wrap items-center gap-2">
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
              <Input type="date" name="from" defaultValue={dateFrom ?? ""} className="w-36" />
              <Input type="date" name="to" defaultValue={dateTo ?? ""} className="w-36" />
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>

            {result.items.length === 0 ? (
              <EmptyState
                title="Sin asignaciones"
                description={
                  technicianId || status || dateFrom || dateTo
                    ? "Ninguna asignación coincide con los filtros."
                    : "Asigna una orden de trabajo a un técnico."
                }
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Orden</th>
                        <th className="px-4 py-3 font-medium">Técnico</th>
                        <th className="px-4 py-3 font-medium">Inicio</th>
                        <th className="px-4 py-3 font-medium">Fin</th>
                        <th className="px-4 py-3 font-medium">Duración</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.items.map((a) => (
                        <tr key={a.id} className="align-top">
                          <td className="px-4 py-4">
                            <Link
                              href={`${basePath}/${a.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {a.workOrderNumber ?? "—"}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {a.workOrderSubject ?? ""}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {a.technicianName ??
                              technicianLabels.get(a.technicianId) ??
                              "—"}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {fmt(a.scheduledStart)}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {fmt(a.scheduledEnd)}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground tabular-nums">
                            {a.estimatedDurationMinutes} min
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}
                            >
                              {ASSIGNMENT_STATUS_LABELS[a.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  basePath={basePath}
                  search={null}
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={result.total}
                  extraParams={{ technician: technicianId, status, from: dateFrom, to: dateTo }}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
