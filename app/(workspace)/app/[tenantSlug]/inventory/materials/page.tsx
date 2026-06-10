import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/layout/empty-state"
import { ExportButton } from "@/components/integrations/export-button"
import { QueueExportButton } from "@/components/integrations/queue-export-button"
import { PageHeader } from "@/components/layout/page-header"
import { Pagination } from "@/components/crm/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { INVENTORY_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { searchInventoryMaterials } from "@/modules/inventory/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Materials" }

const PAGE_SIZE = 20

export default async function MaterialsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; sku?: string; active?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, INVENTORY_PERMISSIONS.materialsRead)

  const search = sp.search?.trim() ? sp.search.trim() : null
  const sku = sp.sku?.trim() ? sp.sku.trim() : null
  const active = sp.active === "true" ? true : sp.active === "false" ? false : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const base = `/app/${tenantSlug}/inventory/materials`
  const result = await searchInventoryMaterials(context.tenantId, {
    search,
    sku,
    active,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  return (
    <>
      <PageHeader title="Materials" description="Material catalog and stock units." />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <form action={base} className="flex flex-wrap items-center gap-2">
            <Input type="search" name="search" defaultValue={search ?? ""} placeholder="Search by name..." className="w-52" />
            <Input type="search" name="sku" defaultValue={sku ?? ""} placeholder="SKU..." className="w-36" />
            <select
              name="active"
              defaultValue={active === true ? "true" : active === false ? "false" : ""}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <Button type="submit" variant="outline" size="sm">Filter</Button>
          </form>
          <div className="flex items-center gap-2">
            <ExportButton
              tenantSlug={tenantSlug}
              object="materials"
              filters={{ search, sku, active: sp.active ?? null }}
            />
            <QueueExportButton
              tenantSlug={tenantSlug}
              object="materials"
              filters={{ search, sku, active: sp.active ?? null }}
            />
          </div>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="No materials"
            description={search || sku || active !== null ? "No materials match your filters." : "No materials in this workspace yet."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">UOM</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((mat) => (
                  <tr key={mat.id}>
                    <td className="px-4 py-3">
                      <Link href={`${base}/${mat.id}`} className="font-medium text-foreground hover:underline">
                        {mat.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{mat.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mat.unitOfMeasure}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          mat.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {mat.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath={base}
          search={search}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          extraParams={{ sku, active: sp.active ?? null }}
        />
      </div>
    </>
  )
}
