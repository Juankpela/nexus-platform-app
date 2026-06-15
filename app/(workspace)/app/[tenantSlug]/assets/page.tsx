import { Plus, Upload } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { AssetCsvImport } from "@/components/service/asset-csv-import"
import { AssetFormDialog } from "@/components/service/asset-form-dialog"
import { HealthScoreBadge } from "@/components/service/health-score-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantAssets } from "@/modules/service/composition"
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_LABELS,
  ASSET_CRITICALITIES,
  ASSET_CRITICALITY_LABELS,
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPE_LABELS,
  type AssetCategory,
  type AssetCriticality,
  type AssetStatus,
} from "@/modules/service/domain/asset"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Assets" }

const PAGE_SIZE = 10

const statusStyles: Record<AssetStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  in_maintenance: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  down: "bg-red-500/10 text-red-600 dark:text-red-400",
  retired: "bg-muted text-muted-foreground",
}

const criticalityStyles: Record<AssetCriticality, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
}

function parseStatus(v?: string): AssetStatus | null {
  return (ASSET_STATUSES as string[]).includes(v ?? "")
    ? (v as AssetStatus)
    : null
}
function parseCategory(v?: string): AssetCategory | null {
  return (ASSET_CATEGORIES as string[]).includes(v ?? "")
    ? (v as AssetCategory)
    : null
}
function parseCriticality(v?: string): AssetCriticality | null {
  return (ASSET_CRITICALITIES as string[]).includes(v ?? "")
    ? (v as AssetCriticality)
    : null
}

export default async function AssetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    category?: string
    criticality?: string
    page?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, SERVICE_PERMISSIONS.assetsRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.assetsWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const status = parseStatus(sp.status)
  const category = parseCategory(sp.category)
  const criticality = parseCriticality(sp.criticality)
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/assets`

  const result = await listTenantAssets(
    context.tenantId,
    { search, status, category, criticality, companyId: null },
    page,
    PAGE_SIZE,
  )

  const selectClass =
    "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

  return (
    <>
      <PageHeader
        title="Activos"
        description="Inventario de maquinaria y equipos — base de Field Service."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form action={basePath} className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar por nombre, número o serie..."
              className="w-60"
            />
            <select name="status" defaultValue={status ?? ""} className={selectClass}>
              <option value="">Todos los estados</option>
              {ASSET_STATUSES.map((v) => (
                <option key={v} value={v}>
                  {ASSET_STATUS_LABELS[v]}
                </option>
              ))}
            </select>
            <select
              name="category"
              defaultValue={category ?? ""}
              className={selectClass}
            >
              <option value="">Todas las categorías</option>
              {ASSET_CATEGORIES.map((v) => (
                <option key={v} value={v}>
                  {ASSET_CATEGORY_LABELS[v]}
                </option>
              ))}
            </select>
            <select
              name="criticality"
              defaultValue={criticality ?? ""}
              className={selectClass}
            >
              <option value="">Toda criticidad</option>
              {ASSET_CRITICALITIES.map((v) => (
                <option key={v} value={v}>
                  {ASSET_CRITICALITY_LABELS[v]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Filtrar
            </Button>
          </form>

          {canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <AssetCsvImport
                tenantSlug={tenantSlug}
                trigger={
                  <Button variant="outline">
                    <Upload />
                    Importar activos
                  </Button>
                }
              />
              <AssetFormDialog
                tenantSlug={tenantSlug}
                trigger={
                  <Button>
                    <Plus />
                    Nuevo activo
                  </Button>
                }
              />
            </div>
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Sin activos"
            description={
              search || status || category || criticality
                ? "Ningún activo coincide con los filtros."
                : "Registra tu primer activo."
            }
            actions={
              canWrite ? (
                <ClientOnly>
                  <AssetFormDialog
                    tenantSlug={tenantSlug}
                    trigger={
                      <Button>
                        <Plus />
                        Crear activo
                      </Button>
                    }
                  />
                  <AssetCsvImport
                    tenantSlug={tenantSlug}
                    trigger={
                      <Button variant="outline">
                        <Upload />
                        Importar activos
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
                    <th className="px-4 py-3 font-medium">Número</th>
                    <th className="px-4 py-3 font-medium">Activo</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 font-medium">Empresa</th>
                    <th className="px-4 py-3 font-medium">Criticidad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Salud</th>
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
                          {a.assetNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{a.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {ASSET_TYPE_LABELS[a.assetType]}
                          {a.serialNumber ? ` · ${a.serialNumber}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {ASSET_CATEGORY_LABELS[a.assetCategory]}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {a.companyName ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${criticalityStyles[a.criticality]}`}
                        >
                          {ASSET_CRITICALITY_LABELS[a.criticality]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[a.status]}`}
                        >
                          {ASSET_STATUS_LABELS[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <HealthScoreBadge score={a.healthScore} />
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
              extraParams={{ status, category, criticality }}
            />
          </>
        )}
      </div>
    </>
  )
}
