import { Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { ActiveToggle } from "@/components/crm/active-toggle"
import { setPriceBookActiveAction } from "@/modules/crm/presentation/price-book-actions"
import { PriceBookFormDialog } from "@/components/crm/price-book-form-dialog"
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
import { listTenantPriceBooks } from "@/modules/crm/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Listas de precios" }

const PAGE_SIZE = 20

export default async function PriceBooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.priceBooksRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.priceBooksWrite,
  )

  const search = sp.search?.trim() ? sp.search.trim() : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const basePath = `/app/${tenantSlug}/price-books`

  const result = await listTenantPriceBooks(context.tenantId, {
    search,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <>
      <PageHeader
        title="Listas de precios"
        description="Gestiona los precios para distintos segmentos de clientes."
      />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <form action={basePath} className="w-full max-w-xs">
            <Input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar listas de precios..."
            />
          </form>
          {canWrite ? (
            <PriceBookFormDialog
              tenantSlug={tenantSlug}
              trigger={
                <Button>
                  <Plus />
                  Nueva lista de precios
                </Button>
              }
            />
          ) : null}
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            title="Sin listas de precios"
            description={
              search
                ? "Ninguna lista de precios coincide con tu búsqueda."
                : "Crea tu primera lista de precios para empezar."
            }
            actions={
              canWrite ? (
                <ClientOnly>
                  <PriceBookFormDialog
                    tenantSlug={tenantSlug}
                    trigger={
                      <Button>
                        <Plus />
                        Crear lista de precios
                      </Button>
                    }
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
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {canWrite ? (
                    <th className="px-4 py-3 text-right font-medium">
                      Acciones
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((book) => (
                  <tr key={book.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/app/${tenantSlug}/price-books/${book.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {book.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {book.description ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          book.active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {book.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    {canWrite ? (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <PriceBookFormDialog
                            tenantSlug={tenantSlug}
                            priceBook={book}
                            trigger={
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            }
                          />
                          <ActiveToggle
                            action={setPriceBookActiveAction}
                            tenantSlug={tenantSlug}
                            id={book.id}
                            active={book.active}
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
