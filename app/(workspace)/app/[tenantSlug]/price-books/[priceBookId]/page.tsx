import { ArrowLeft, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PriceBookActiveToggle } from "@/components/crm/price-book-active-toggle"
import {
  AddPriceBookEntryDialog,
  DeactivatePriceBookEntryButton,
  EditPriceBookEntryDialog,
} from "@/components/crm/price-book-entry-form"
import { PriceBookFormDialog } from "@/components/crm/price-book-form-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getPriceBookRecord,
  listPriceBookEntries,
  listProductOptions,
} from "@/modules/crm/composition"
import {
  PRODUCT_FAMILY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/modules/crm/domain/product"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Price Book" }

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export default async function PriceBookDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; priceBookId: string }>
}) {
  const { tenantSlug, priceBookId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.priceBooksRead,
  )

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.priceBooksWrite,
  )

  const [priceBook, entries, productOptions] = await Promise.all([
    getPriceBookRecord(context.tenantId, priceBookId),
    listPriceBookEntries(context.tenantId, priceBookId),
    canWrite ? listProductOptions(context.tenantId) : Promise.resolve([]),
  ])

  if (!priceBook) notFound()

  const entryProductIds = new Set(entries.map((e) => e.productId))
  const availableProducts = productOptions.filter(
    (p) => !entryProductIds.has(p.id),
  )

  return (
    <>
      <PageHeader
        title={priceBook.name}
        description="Price book details and product prices."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link
            href={`/app/${tenantSlug}/price-books`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Price Books
          </Link>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <PriceBookFormDialog
                tenantSlug={tenantSlug}
                priceBook={priceBook}
                trigger={<Button variant="outline">Edit price book</Button>}
              />
              <PriceBookActiveToggle
                tenantSlug={tenantSlug}
                id={priceBook.id}
                active={priceBook.active}
              />
            </div>
          ) : null}
        </div>

        {/* Info card */}
        <div className="rounded-xl border bg-card p-5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              priceBook.active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {priceBook.active ? "Active" : "Inactive"}
          </span>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail
              label="Created"
              value={new Date(priceBook.createdAt).toLocaleDateString()}
            />
            <Detail
              label="Last Updated"
              value={new Date(priceBook.updatedAt).toLocaleDateString()}
            />
          </dl>
          {priceBook.description ? (
            <div className="mt-4 border-t pt-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {priceBook.description}
              </p>
            </div>
          ) : null}
        </div>

        {/* Product prices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Product Prices
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({entries.length})
              </span>
            </h2>
            {canWrite && availableProducts.length > 0 ? (
              <AddPriceBookEntryDialog
                tenantSlug={tenantSlug}
                priceBookId={priceBookId}
                products={availableProducts}
                trigger={
                  <Button size="sm">
                    <Plus />
                    Add product price
                  </Button>
                }
              />
            ) : null}
          </div>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No product prices yet.
                {canWrite ? " Add a product price to get started." : ""}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Type / Family</th>
                    <th className="px-4 py-3 font-medium">Unit Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {canWrite ? (
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="align-top">
                      <td className="px-4 py-4">
                        <Link
                          href={`/app/${tenantSlug}/products/${entry.productId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {entry.productName}
                        </Link>
                        {entry.productSku ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            SKU: {entry.productSku}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <p>{PRODUCT_TYPE_LABELS[entry.productType]}</p>
                        <p className="text-xs">
                          {PRODUCT_FAMILY_LABELS[entry.productFamily]}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono text-sm">
                        {entry.unitPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canWrite ? (
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <EditPriceBookEntryDialog
                              tenantSlug={tenantSlug}
                              entry={entry}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                            <DeactivatePriceBookEntryButton
                              tenantSlug={tenantSlug}
                              entry={entry}
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
        </div>
      </div>
    </>
  )
}
