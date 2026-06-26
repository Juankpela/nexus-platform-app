import { Plus, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { SummaryWidget } from "@/components/dashboard/summary-widget"
import { TechnicianFormDialog } from "@/components/service/technician-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getTenantTechnicianStats,
  listTenantTechnicians,
} from "@/modules/service/composition"
import {
  TECHNICIAN_STATUSES,
  TECHNICIAN_STATUS_LABELS,
  technicianFullName,
  type TechnicianSort,
  type TechnicianStatus,
} from "@/modules/service/domain/technician"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Equipo técnico" }

const PAGE_SIZE = 10
const VALID_TABS = ["list", "stats"] as const
type Tab = (typeof VALID_TABS)[number]

const statusStyles: Record<TechnicianStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  inactive: "bg-muted text-muted-foreground",
  on_leave: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

function parseTab(v?: string): Tab {
  return (VALID_TABS as readonly string[]).includes(v ?? "") ? (v as Tab) : "list"
}
function parseStatus(v?: string): TechnicianStatus | null {
  return (TECHNICIAN_STATUSES as string[]).includes(v ?? "")
    ? (v as TechnicianStatus)
    : null
}
function parseSort(v?: string): TechnicianSort {
  return v === "recent" ? "recent" : "name"
}

export default async function TechniciansPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    tab?: string
    search?: string
    status?: string
    sort?: string
    page?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.techniciansWrite,
  )

  const tab = parseTab(sp.tab)
  const search = sp.search?.trim() ? sp.search.trim() : null
  const status = parseStatus(sp.status)
  const sort = parseSort(sp.sort)
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/technicians`

  const [result, stats] = await Promise.all([
    listTenantTechnicians(context.tenantId, { search, status }, sort, page, PAGE_SIZE),
    getTenantTechnicianStats(context.tenantId),
  ])

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
    return t === "stats" ? `${basePath}?tab=stats` : basePath
  }

  return (
    <>
      <PageHeader
        title="Técnicos"
        description="Tu equipo de técnicos de campo, base para asignar y agendar el trabajo."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        {/* Tabs + create */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
            <Link href={tabHref("list")} className={tabClass("list")}>
              <Users className="size-3.5" /> Lista
            </Link>
            <Link href={tabHref("stats")} className={tabClass("stats")}>
              Métricas
            </Link>
          </div>

          {canWrite ? (
            <TechnicianFormDialog
              tenantSlug={tenantSlug}
              trigger={
                <Button>
                  <Plus />
                  Nuevo técnico
                </Button>
              }
            />
          ) : null}
        </div>

        {tab === "stats" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total" value={stats.total} icon={Users} accent="blue" />
              <KpiCard
                label="Activos"
                value={stats.byStatus.active}
                icon={Users}
                accent="emerald"
              />
              <KpiCard
                label="En licencia"
                value={stats.byStatus.on_leave}
                icon={Users}
                accent="orange"
              />
              <KpiCard
                label="Inactivos"
                value={stats.byStatus.inactive}
                icon={Users}
                accent="silver"
              />
            </div>
            <SummaryWidget
              title="Técnicos por estado"
              rows={TECHNICIAN_STATUSES.map((s) => ({
                label: TECHNICIAN_STATUS_LABELS[s],
                value: stats.byStatus[s],
              }))}
            />
          </div>
        ) : (
          <>
            {/* Filters */}
            <form action={basePath} className="flex flex-wrap items-center gap-2">
              <Input
                type="search"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Buscar por nombre, email o ID..."
                className="w-60"
              />
              <select name="status" defaultValue={status ?? ""} className={selectClass}>
                <option value="">Todos los estados</option>
                {TECHNICIAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TECHNICIAN_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select name="sort" defaultValue={sort} className={selectClass}>
                <option value="name">Ordenar: Nombre</option>
                <option value="recent">Ordenar: Recientes</option>
              </select>
              <Button type="submit" variant="outline" size="sm">
                Filtrar
              </Button>
            </form>

            {result.items.length === 0 ? (
              <EmptyState
                title="Sin técnicos"
                description={
                  search || status
                    ? "Ningún técnico coincide con los filtros."
                    : "Registra tu primer técnico de campo."
                }
                actions={
                  canWrite ? (
                    <ClientOnly>
                      <TechnicianFormDialog
                        tenantSlug={tenantSlug}
                        trigger={
                          <Button>
                            <Plus />
                            Crear técnico
                          </Button>
                        }
                      />
                    </ClientOnly>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Técnico</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Teléfono</th>
                        <th className="px-4 py-3 font-medium">ID empleado</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.items.map((t) => (
                        <tr key={t.id} className="align-top">
                          <td className="px-4 py-4">
                            <Link
                              href={`${basePath}/${t.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {technicianFullName(t)}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">{t.email}</td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {t.phone ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {t.employeeId ?? "—"}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[t.status]}`}
                            >
                              {TECHNICIAN_STATUS_LABELS[t.status]}
                            </span>
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
                  extraParams={{ status, sort }}
                />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
