import { Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ProductActiveToggle } from "@/components/crm/product-active-toggle"
import { ProductCsvExport } from "@/components/crm/product-csv-export"
import { ProductCsvImport } from "@/components/crm/product-csv-import"
import { ProductFormDialog } from "@/components/crm/product-form-dialog"
import { Pagination } from "@/components/crm/pagination"
import { ClientOnly } from "@/components/layout/client-only"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { listTenantProducts } from "@/modules/crm/composition"
import {
  PRODUCT_FAMILIES,
  PRODUCT_FAMILY_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  type ProductFamily,
  type ProductType,
} from "@/modules/crm/domain/product"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Products" }

const PAGE_SIZE = 20

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{
    search?: string
    page?: string
    productType?: string
    productFamily?: string
    active?: string
  }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.productsRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.productsWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1

  const productTypeFilter = PRODUCT_TYPES.includes(
    sp.productType as ProductType,
  )
    ? (sp.productType as ProductType)
    : null
  const productFamilyFilter = PRODUCT_FAMILIES.includes(
    sp.productFamily as ProductFamily,
  )
    ? (sp.productFamily as ProductFamily)
    : null
  const activeFilter =
    sp.active === "true" ? true : sp.active === "false" ? false : null

  const basePath = `/app/${tenantSlug}/products`

  const result = await listTenantProducts(context.tenantId, {
    search,
    productType: productTypeFilter,
    productFamily: productFamilyFilter,
    active: activeFilter,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestiona el catálogo de productos de este espacio de trabajo."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <form action={basePath} className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar productos..."
              className="w-52"
            />
            <select
              name="productType"
              defaultValue={productTypeFilter ?? ""}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todos los tipos</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              name="productFamily"
              defaultValue={productFamilyFilter ?? ""}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todas las familias</option>
              {PRODUCT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {PRODUCT_FAMILY_LABELS[f]}
                </option>
              ))}
            </select>
            <select
              name="active"
              defaultValue={
                activeFilter === true
                  ? "true"
                  : activeFilter === false
                    ? "false"
                    : ""
              }
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
            <Button type="submit" variant="outline" size="sm">
              Filtrar
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <ProductCsvExport tenantSlug={tenantSlug} />
            {canWrite ? (
              <>
                <ProductCsvImport
                  tenantSlug={tenantSlug}
                  trigger={<Button variant="outline">Importar CSV</Button>}
                />
                <ProductFormDialog
                  tenantSlug={tenantSlug}
                  trigger={
                    <Button>
                      <Plus />
                      Nuevo producto
                    </Button>
                  }
                />
              </>
            ) : null}
          </div>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Sin productos"
            description={
              search || productTypeFilter || productFamilyFilter
                ? "Ningún producto coincide con los filtros."
                : "Crea tu primer producto para empezar."
            }
            actions={
              canWrite ? (
                <ClientOnly>
                  <ProductFormDialog
                    tenantSlug={tenantSlug}
                    trigger={
                      <Button>
                        <Plus />
                        Crear producto
                      </Button>
                    }
                  />
                  <ProductCsvImport
                    tenantSlug={tenantSlug}
                    trigger={<Button variant="outline">Importar productos</Button>}
                  />
                </ClientOnly>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Familia</th>
                  <th className="px-4 py-3 font-medium">UM</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {canWrite ? (
                    <th className="px-4 py-3 text-right font-medium">
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((product) => (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/app/${tenantSlug}/products/${product.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.sku ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          SKU: {product.sku}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {PRODUCT_TYPE_LABELS[product.productType]}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {PRODUCT_FAMILY_LABELS[product.productFamily]}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {product.unitOfMeasure ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ProductFormDialog
                            tenantSlug={tenantSlug}
                            product={product}
                            trigger={
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            }
                          />
                          <ProductActiveToggle
                            tenantSlug={tenantSlug}
                            id={product.id}
                            active={product.active}
                          />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath={basePath}
          search={search}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
        />
      </div>
    </>
  )
}
