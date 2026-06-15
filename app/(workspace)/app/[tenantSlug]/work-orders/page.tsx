import { Columns3, LayoutList, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { WorkOrderFormDialog } from "@/components/service/work-order-form-dialog"
import { WorkOrderKanbanClient } from "@/components/service/work-order-kanban-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listCompanyOptions } from "@/modules/crm/composition"
import type { CompanyOption } from "@/modules/crm/domain/company"
import {
  listAssetOptions,
  listTenantCases,
  listTenantTechnicians,
  listTenantWorkOrders,
} from "@/modules/service/composition"
import { technicianFullName } from "@/modules/service/domain/technician"
import { getActiveAssignmentsByWorkOrder } from "@/modules/scheduling/composition"
import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Work Orders" }

const PAGE_SIZE = 10
const KANBAN_PAGE_SIZE = 200

const statusStyles: Record<WorkOrderStatus, string> = {
  new: "bg-muted text-muted-foreground",
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  dispatched: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  on_hold: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
}

const priorityStyles: Record<WorkOrderPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseStatus(v?: string): WorkOrderStatus | null {
  return (WORK_ORDER_STATUSES as string[]).includes(v ?? "")
    ? (v as WorkOrderStatus)
    : null
}
function parsePriority(v?: string): WorkOrderPriority | null {
  return (WORK_ORDER_PRIORITIES as string[]).includes(v ?? "")
    ? (v as WorkOrderPriority)
    : null
}

export default async function WorkOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    technician?: string
    company?: string
    asset?: string
    from?: string
    to?: string
    page?: string
    view?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersWrite,
  )

  const isKanban = sp.view === "kanban"
  const search = sp.search?.trim() ? sp.search.trim() : null
  const status = isKanban ? null : parseStatus(sp.status)
  const priority = parsePriority(sp.priority)
  const technicianId = sp.technician?.trim() ? sp.technician.trim() : null
  const companyId = sp.company?.trim() ? sp.company.trim() : null
  const assetId = sp.asset?.trim() ? sp.asset.trim() : null
  const dateFrom = sp.from?.trim() ? sp.from.trim() : null
  const dateTo = sp.to?.trim() ? sp.to.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/work-orders`

  const filters = {
    search,
    status,
    priority,
    technicianId,
    companyId,
    assetId,
    dateFrom,
    dateTo,
  }

  const [result, techPage, companyOptions, assetOptions, caseResult] =
    await Promise.all([
      listTenantWorkOrders(
        context.tenantId,
        filters,
        isKanban ? 1 : page,
        isKanban ? KANBAN_PAGE_SIZE : PAGE_SIZE,
      ),
      listTenantTechnicians(
        context.tenantId,
        { search: null, status: null },
        "name",
        1,
        200,
      ),
      canWrite
        ? listCompanyOptions(context.tenantId)
        : Promise.resolve([] as CompanyOption[]),
      listAssetOptions(context.tenantId),
      canWrite
        ? listTenantCases(
            context.tenantId,
            { search: null, status: null, priority: null, ownerId: null },
            1,
            100,
          )
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 0 }),
    ])

  const technicianOptions = techPage.items.map((t) => ({
    id: t.id,
    label: technicianFullName(t),
  }))
  // ADR-031: "current technician" derives from the active assignment, not the
  // legacy assigned_technician_id — so the list agrees with the dispatch board.
  const activeAssignments = await getActiveAssignmentsByWorkOrder(
    context.tenantId,
    result.items.map((wo) => wo.id),
  )
  const caseOptions = caseResult.items.map((c) => ({
    id: c.id,
    label: `${c.caseNumber} · ${c.subject}`,
  }))

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  function viewHref(v: "list" | "kanban") {
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (priority) p.set("priority", priority)
    if (technicianId) p.set("technician", technicianId)
    if (companyId) p.set("company", companyId)
    if (v === "kanban") p.set("view", "kanban")
    const qs = p.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <>
      <PageHeader
        title="Órdenes de trabajo"
        description="Field Service — intervenciones técnicas sobre activos."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <form action={basePath} className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Buscar por asunto o número..."
                className="w-52"
              />
              {!isKanban && (
                <select name="status" defaultValue={status ?? ""} className={selectClass}>
                  <option value="">Todos los estados</option>
                  {WORK_ORDER_STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {WORK_ORDER_STATUS_LABELS[v]}
                    </option>
                  ))}
                </select>
              )}
              <select name="priority" defaultValue={priority ?? ""} className={selectClass}>
                <option value="">Toda prioridad</option>
                {WORK_ORDER_PRIORITIES.map((v) => (
                  <option key={v} value={v}>
                    {WORK_ORDER_PRIORITY_LABELS[v]}
                  </option>
                ))}
              </select>
              <select name="technician" defaultValue={technicianId ?? ""} className={selectClass}>
                <option value="">Todos los técnicos</option>
                {technicianOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select name="company" defaultValue={companyId ?? ""} className={selectClass}>
                <option value="">Todas las empresas</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input type="date" name="from" defaultValue={dateFrom ?? ""} className="w-36" />
              <Input type="date" name="to" defaultValue={dateTo ?? ""} className="w-36" />
              {isKanban && <input type="hidden" name="view" value="kanban" />}
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>

            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              <Link
                href={viewHref("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  !isKanban ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutList className="size-3.5" />
                Lista
              </Link>
              <Link
                href={viewHref("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isKanban ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns3 className="size-3.5" />
                Kanban
              </Link>
            </div>
          </div>

          {canWrite ? (
            <WorkOrderFormDialog
              tenantSlug={tenantSlug}
              companyOptions={companyOptions}
              caseOptions={caseOptions}
              assetOptions={assetOptions}
              trigger={
                <Button>
                  <Plus />
                  Nueva orden
                </Button>
              }
            />
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Sin órdenes de trabajo"
            description={
              search || status || priority || technicianId || companyId
                ? "Ninguna orden coincide con los filtros."
                : "Crea la primera orden de trabajo."
            }
            actions={
              canWrite ? (
                <ClientOnly>
                  <WorkOrderFormDialog
                    tenantSlug={tenantSlug}
                    companyOptions={companyOptions}
                    caseOptions={caseOptions}
                    assetOptions={assetOptions}
                    trigger={
                      <Button>
                        <Plus />
                        Crear orden
                      </Button>
                    }
                  />
                </ClientOnly>
              ) : undefined
            }
          />
        ) : isKanban ? (
          <WorkOrderKanbanClient
            workOrders={result.items}
            basePath={basePath}
            tenantSlug={tenantSlug}
            canWrite={canWrite}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Asunto</th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Técnico</th>
                    <th className="px-4 py-3 font-medium">Prioridad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Programada</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.items.map((wo) => (
                    <tr key={wo.id} className="align-top">
                      <td className="px-4 py-4">
                        <Link
                          href={`${basePath}/${wo.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {wo.workOrderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{wo.subject}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {wo.assetName ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {wo.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {activeAssignments.get(wo.id)?.technicianName ?? "Sin asignar"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[wo.priority]}`}>
                          {WORK_ORDER_PRIORITY_LABELS[wo.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[wo.status]}`}>
                          {WORK_ORDER_STATUS_LABELS[wo.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {wo.scheduledStart
                          ? new Date(wo.scheduledStart).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              basePath={basePath}
              search={search}
              page={page}
              pageSize={PAGE_SIZE}
              total={result.total}
              extraParams={{
                status,
                priority,
                technician: technicianId,
                company: companyId,
                asset: assetId,
                from: dateFrom,
                to: dateTo,
              }}
            />
          </>
        )}
      </div>
    </>
  )
}
