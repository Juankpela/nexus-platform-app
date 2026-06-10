import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Pagination } from "@/components/crm/pagination"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  INVENTORY_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getInventorySnapshot,
  listInventoryTransactions,
} from "@/modules/inventory/composition"
import {
  REFERENCE_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/modules/inventory/domain/inventory-transaction"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Material" }

const PAGE_SIZE = 20

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  })
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export default async function MaterialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; materialId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { tenantSlug, materialId } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, INVENTORY_PERMISSIONS.materialsRead)

  const canReadStock = hasPermission(context.effectivePermissions, INVENTORY_PERMISSIONS.stockRead)
  const { material, item } = await getInventorySnapshot(context.tenantId, materialId)
  if (!material) notFound()

  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const base = `/app/${tenantSlug}/inventory/materials`

  const history = canReadStock
    ? await listInventoryTransactions(context.tenantId, {
        materialId,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
    : { items: [], total: 0 }

  return (
    <>
      <PageHeader title={material.name} description={material.sku ? `SKU: ${material.sku}` : "Material detail"} />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <Link href={base} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Materials
        </Link>

        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Unit of measure: </span>{material.unitOfMeasure}</div>
            <div><span className="text-muted-foreground">Status: </span>{material.active ? "Active" : "Inactive"}</div>
            {material.description ? (
              <div className="sm:col-span-2"><span className="text-muted-foreground">Description: </span>{material.description}</div>
            ) : null}
          </div>
        </div>

        {canReadStock ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="On hand" value={item?.quantityOnHand ?? 0} />
            <Stat label="Reserved" value={item?.quantityReserved ?? 0} />
            <Stat label="Available" value={item?.quantityAvailable ?? 0} />
          </div>
        ) : null}

        {canReadStock ? (
          <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Transaction history</h2>
            </div>
            {history.items.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No movements" description="This material has no stock movements yet." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                    <th className="px-4 py-2.5 font-medium">Reference</th>
                    <th className="px-4 py-2.5 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.items.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-2.5">{TRANSACTION_TYPE_LABELS[tx.type]}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{tx.quantity}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{REFERENCE_TYPE_LABELS[tx.referenceType]}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{fmt(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="px-4">
              <Pagination basePath={`${base}/${materialId}`} search={null} page={page} pageSize={PAGE_SIZE} total={history.total} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
