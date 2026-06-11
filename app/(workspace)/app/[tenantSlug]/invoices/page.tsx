import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { listTenantInvoices } from "@/modules/billing/composition"
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type InvoiceStatus,
} from "@/modules/billing/domain/invoice"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Invoices" }

const PAGE_SIZE = 20

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, BILLING_PERMISSIONS.invoicesRead)

  const page = Math.max(1, Number(sp.page ?? 1))
  const statusFilter =
    sp.status && sp.status !== "_all" ? (sp.status as InvoiceStatus) : null
  const search = sp.search ?? null

  const { items, total } = await listTenantInvoices(context.tenantId, {
    search,
    status: statusFilter,
    companyId: null,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="space-y-6 p-5 sm:p-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} invoice{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <Input
          name="search"
          placeholder="Search by invoice number…"
          defaultValue={sp.search ?? ""}
          className="h-9 w-52"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "_all"}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="_all">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {(sp.search || (sp.status && sp.status !== "_all")) && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/invoices`}>Clear</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices are generated from completed, billable work orders."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((inv) => (
                  <tr key={inv.id} className="align-top hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/${tenantSlug}/invoices/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoiceNumber ?? "Draft"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.companyName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {inv.totalAmount.toLocaleString("es-CO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {inv.balance.toLocaleString("es-CO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString(undefined, { timeZone: "America/Bogota" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString(undefined, { timeZone: "America/Bogota" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath={`/app/${tenantSlug}/invoices`}
            search={search}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            extraParams={statusFilter ? { status: statusFilter } : undefined}
          />
        </>
      )}
    </div>
  )
}
