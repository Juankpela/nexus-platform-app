import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { formatDateNumeric } from "@/lib/format/datetime"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { listTenantPayments } from "@/modules/billing/composition"
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  type PaymentMethod,
  type PaymentStatus,
} from "@/modules/billing/domain/payment"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Pagos" }

const PAGE_SIZE = 20

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { tenantSlug } = await params
  const sp = await searchParams
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, BILLING_PERMISSIONS.paymentsRead)

  const page = Math.max(1, Number(sp.page ?? 1))
  const statusFilter =
    sp.status && sp.status !== "_all" ? (sp.status as PaymentStatus) : null

  const { items, total } = await listTenantPayments(context.tenantId, {
    status: statusFilter,
    companyId: null,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} payment{total !== 1 ? "s" : ""}
        </p>
      </div>

      <form className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={sp.status ?? "_all"}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="_all">Todos los estados</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {sp.status && sp.status !== "_all" && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/payments`}>Limpiar</Link>
          </Button>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Payments are recorded against issued invoices."
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Payment #</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="px-4 py-3 font-medium">{p.paymentNumber}</td>
                    <td className="px-4 py-3">{p.companyName ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ??
                        p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}
                      >
                        {PAYMENT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.amount.toLocaleString("es-CO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateNumeric(p.paymentDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath={`/app/${tenantSlug}/payments`}
            search={null}
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
