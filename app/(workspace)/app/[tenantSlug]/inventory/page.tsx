import { Boxes, PackageSearch, AlertTriangle, ArrowRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { INVENTORY_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getInventoryOverviewStats } from "@/modules/inventory/composition"
import {
  REFERENCE_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/modules/inventory/domain/inventory-transaction"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Inventario" }

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  })
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string
  value: number
  icon: typeof Boxes
  tone?: "default" | "warning"
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`size-4 ${tone === "warning" ? "text-amber-500" : "text-muted-foreground"}`}
        />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export default async function InventoryOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>
}) {
  const { tenantSlug } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, INVENTORY_PERMISSIONS.stockRead)

  const overview = await getInventoryOverviewStats(context.tenantId)
  const base = `/app/${tenantSlug}/inventory`

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock levels and recent movements across this workspace."
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Materials" value={overview.totalMaterials} icon={PackageSearch} />
          <Kpi label="Stocked items" value={overview.totalItems} icon={Boxes} />
          <Kpi
            label="Low / out of stock"
            value={overview.lowStockCount}
            icon={AlertTriangle}
            tone="warning"
          />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Movimientos recientes</h2>
            <Link
              href={`${base}/transactions`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {overview.recentMovements.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No movements yet"
                description="Stock movements will appear here as they happen."
              />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Material</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cant.</th>
                  <th className="px-4 py-2.5 font-medium">Referencia</th>
                  <th className="px-4 py-2.5 font-medium">Cuándo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {overview.recentMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">{TRANSACTION_TYPE_LABELS[m.type]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {m.materialName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.quantity}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {REFERENCE_TYPE_LABELS[m.referenceType]}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fmt(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
