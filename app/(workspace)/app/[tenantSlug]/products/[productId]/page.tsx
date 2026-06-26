import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ActiveToggle } from "@/components/crm/active-toggle"
import { setProductActiveAction } from "@/modules/crm/presentation/product-actions"
import { ProductFormDialog } from "@/components/crm/product-form-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  CRM_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getProductRecord,
  listProductPriceAssignments,
  listSubjectAuditEvents,
} from "@/modules/crm/composition"
import {
  PRODUCT_FAMILY_LABELS,
  PRODUCT_TYPE_LABELS,
} from "@/modules/crm/domain/product"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Producto" }

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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>
}) {
  const { tenantSlug, productId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.productsRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.productsWrite,
  )

  const [product, assignments, auditEvents] = await Promise.all([
    getProductRecord(context.tenantId, productId),
    listProductPriceAssignments(context.tenantId, productId),
    listSubjectAuditEvents(context.tenantId, productId, 10),
  ])

  if (!product) notFound()

  return (
    <>
      <PageHeader title={product.name} description="Product details." />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <Link
            href={`/app/${tenantSlug}/products`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Products
          </Link>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <ProductFormDialog
                tenantSlug={tenantSlug}
                product={product}
                trigger={<Button variant="outline">Editar producto</Button>}
              />
              <ActiveToggle
                action={setProductActiveAction}
                tenantSlug={tenantSlug}
                id={product.id}
                active={product.active}
              />
            </div>
          ) : null}
        </div>

        {/* Product info card */}
        <div className="rounded-xl border bg-card p-5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              product.active
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {product.active ? "Active" : "Inactive"}
          </span>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="SKU" value={product.sku} />
            <Detail
              label="Product Type"
              value={PRODUCT_TYPE_LABELS[product.productType]}
            />
            <Detail
              label="Product Family"
              value={PRODUCT_FAMILY_LABELS[product.productFamily]}
            />
            <Detail label="Unit of Measure" value={product.unitOfMeasure} />
            <Detail
              label="Created"
              value={new Date(product.createdAt).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
            />
            <Detail
              label="Last Updated"
              value={new Date(product.updatedAt).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
            />
          </dl>
          {product.description ? (
            <div className="mt-4 border-t pt-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {product.description}
              </p>
            </div>
          ) : null}
        </div>

        {/* Price book assignments */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">
            Price Book Assignments
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({assignments.length})
            </span>
          </h2>
          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                This product is not assigned to any active price book.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Price Book</th>
                    <th className="px-4 py-3 font-medium">Unit Price</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map((a) => (
                    <tr key={a.entryId} className="align-top">
                      <td className="px-4 py-4">
                        <Link
                          href={`/app/${tenantSlug}/price-books/${a.priceBookId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {a.priceBookName}
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-mono text-sm">
                        {a.unitPrice.toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit history */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Audit History</h2>
          {auditEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No audit events recorded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditEvents.map((ev) => (
                    <tr key={ev.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{ev.action}</p>
                        {ev.actorId ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            by {ev.actorType}:{ev.actorId.slice(0, 8)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(ev.occurredAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                      </td>
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
