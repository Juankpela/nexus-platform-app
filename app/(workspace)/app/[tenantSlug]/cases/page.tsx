import { Columns3, LayoutList, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { CaseFormDialog } from "@/components/service/case-form-dialog"
import { CaseKanbanClient } from "@/components/service/case-kanban-client"
import { SlaBadge } from "@/components/service/sla-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listCompanyOptions, listContactOptions } from "@/modules/crm/composition"
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import { listAssetOptions, listTenantCases } from "@/modules/service/composition"
import type { AssetOption } from "@/modules/service/domain/asset"
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
} from "@/modules/service/domain/case"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { listCachedTenantMembers } from "@/modules/tenancy/composition"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Cases" }

const PAGE_SIZE = 10
const KANBAN_PAGE_SIZE = 200

const statusStyles: Record<CaseStatus, string> = {
  new: "bg-muted text-muted-foreground",
  working: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  waiting_customer: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  escalated: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
}

const priorityStyles: Record<CasePriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseStatus(value?: string): CaseStatus | null {
  return (CASE_STATUSES as string[]).includes(value ?? "")
    ? (value as CaseStatus)
    : null
}

function parsePriority(value?: string): CasePriority | null {
  return (CASE_PRIORITIES as string[]).includes(value ?? "")
    ? (value as CasePriority)
    : null
}

export default async function CasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    owner?: string
    page?: string
    view?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.casesRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.casesWrite,
  )

  const isKanban = sp.view === "kanban"
  const search = sp.search?.trim() ? sp.search.trim() : null
  const status = isKanban ? null : parseStatus(sp.status)
  const priority = parsePriority(sp.priority)
  const ownerId = sp.owner?.trim() ? sp.owner.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/cases`

  const [result, members, companyOptions, contactOptions, assetOptions] =
    await Promise.all([
      listTenantCases(
        context.tenantId,
        { search, status, priority, ownerId },
        isKanban ? 1 : page,
        isKanban ? KANBAN_PAGE_SIZE : PAGE_SIZE,
      ),
      listCachedTenantMembers(context.tenantId),
      canWrite
        ? listCompanyOptions(context.tenantId)
        : Promise.resolve([] as CompanyOption[]),
      canWrite
        ? listContactOptions(context.tenantId)
        : Promise.resolve([] as ContactOption[]),
      canWrite
        ? listAssetOptions(context.tenantId)
        : Promise.resolve([] as AssetOption[]),
    ])

  const ownerLabels = new Map(
    members.map((m) => [m.userId, m.fullName ?? m.email ?? m.userId]),
  )
  const ownerOptions = members.map((m) => ({
    id: m.userId,
    label: m.fullName ?? m.email ?? m.userId,
  }))

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  function viewHref(v: "list" | "kanban") {
    const p = new URLSearchParams()
    if (search) p.set("search", search)
    if (priority) p.set("priority", priority)
    if (ownerId) p.set("owner", ownerId)
    if (v === "kanban") p.set("view", "kanban")
    const qs = p.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <>
      <PageHeader
        title="Casos"
        description="Gestiona los casos de servicio al cliente y su SLA."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <form action={basePath} className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Buscar por asunto o número..."
                className="w-56"
              />
              {!isKanban && (
                <select
                  name="status"
                  defaultValue={status ?? ""}
                  className={selectClass}
                >
                  <option value="">Todos los estados</option>
                  {CASE_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {CASE_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
              <select
                name="priority"
                defaultValue={priority ?? ""}
                className={selectClass}
              >
                <option value="">Todas las prioridades</option>
                {CASE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {CASE_PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
              <select name="owner" defaultValue={ownerId ?? ""} className={selectClass}>
                <option value="">Todos los responsables</option>
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {isKanban && <input type="hidden" name="view" value="kanban" />}
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              <Link
                href={viewHref("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  !isKanban
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutList className="size-3.5" />
                Lista
              </Link>
              <Link
                href={viewHref("kanban")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isKanban
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns3 className="size-3.5" />
                Kanban
              </Link>
            </div>
          </div>

          {canWrite ? (
            <CaseFormDialog
              tenantSlug={tenantSlug}
              companyOptions={companyOptions}
              contactOptions={contactOptions}
              ownerOptions={ownerOptions}
              assetOptions={assetOptions}
              trigger={
                <Button>
                  <Plus />
                  Nuevo caso
                </Button>
              }
            />
          ) : null}
        </div>

        {/* Content */}
        {result.items.length === 0 ? (
          <EmptyState
            title="Sin casos"
            description={
              search || status || priority || ownerId
                ? "Ningún caso coincide con los filtros."
                : "Crea tu primer caso de servicio."
            }
          />
        ) : isKanban ? (
          <CaseKanbanClient
            cases={result.items}
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
                    <th className="px-4 py-3 font-medium">Prioridad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Responsable</th>
                    <th className="px-4 py-3 font-medium">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.items.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="px-4 py-4">
                        <Link
                          href={`${basePath}/${c.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{c.subject}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.contactName ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {c.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[c.priority]}`}
                        >
                          {CASE_PRIORITY_LABELS[c.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[c.status]}`}
                        >
                          {CASE_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {c.ownerId ? (ownerLabels.get(c.ownerId) ?? "—") : "Sin asignar"}
                      </td>
                      <td className="px-4 py-4">
                        <SlaBadge
                          slaDueAt={c.slaDueAt}
                          priority={c.priority}
                          resolvedAt={c.resolvedAt}
                          closedAt={c.closedAt}
                        />
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
              extraParams={{ status, priority, owner: ownerId }}
            />
          </>
        )}
      </div>
    </>
  )
}
