import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { Pagination } from "@/components/crm/pagination"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { INVENTORY_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { listInventoryTransactions } from "@/modules/inventory/composition"
import {
  REFERENCE_TYPE_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/modules/inventory/domain/inventory-transaction"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Inventory movements" }

const PAGE_SIZE = 25

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota",
  })
}

export default async function TransactionHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, INVENTORY_PERMISSIONS.stockRead)

  const type = TRANSACTION_TYPES.includes(sp.type as TransactionType)
    ? (sp.type as TransactionType)
    : null
  const pageRaw = sp.page ? Number.parseInt(sp.page, 10) : 1
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
  const base = `/app/${tenantSlug}/inventory/transactions`

  const result = await listInventoryTransactions(context.tenantId, {
    type,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  return (
    <>
      <PageHeader title="Inventory movements" description="Complete, read-only stock ledger." />
      <div className="space-y-4 px-5 py-6 sm:px-8">
        <form action={base} className="flex flex-wrap items-center gap-2">
          <select
            name="type"
            defaultValue={type ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{TRANSACTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">Filter</Button>
        </form>

        {result.items.length === 0 ? (
          <EmptyState
            title="No movements"
            description={type ? "No movements match your filter." : "No stock movements recorded yet."}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3">{TRANSACTION_TYPE_LABELS[tx.type]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.materialName ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tx.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {REFERENCE_TYPE_LABELS[tx.referenceType]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {tx.createdBy.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          basePath={base}
          search={null}
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          extraParams={{ type: type ?? null }}
        />

        <p className="text-xs text-muted-foreground">
          <Link href={`/app/${tenantSlug}/inventory`} className="hover:text-foreground">← Back to Inventory</Link>
        </p>
      </div>
    </>
  )
}
