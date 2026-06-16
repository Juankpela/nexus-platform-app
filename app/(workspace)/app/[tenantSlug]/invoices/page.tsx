import type { Metadata } from "next"
import Link from "next/link"

import { Pagination } from "@/components/crm/pagination"
import { EmptyState } from "@/components/layout/empty-state"
import { PageHeader } from "@/components/layout/page-header"
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
import { formatDateNumeric } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"

export const metadata: Metadata = { title: "Facturas" }

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

  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const isOverdue = (inv: (typeof items)[number]) =>
    (inv.status === "issued" || inv.status === "partially_paid") &&
    inv.balance > 0 &&
    inv.dueDate != null &&
    inv.dueDate < todayISO

  return (
    <>
      <PageHeader
        title="Facturas"
        description={`${total} ${total !== 1 ? "facturas" : "factura"}`}
      />
      <div className="space-y-6 px-5 py-6 sm:px-8">
      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <Input
          name="search"
          placeholder="Buscar por número…"
          defaultValue={sp.search ?? ""}
          className="h-9 w-52"
        />
        <select
          name="status"
          defaultValue={sp.status ?? "_all"}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          <option value="_all">Todos los estados</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">
          Filtrar
        </Button>
        {(sp.search || (sp.status && sp.status !== "_all")) && (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/invoices`}>Limpiar</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      {items.length === 0 ? (
        <EmptyState
          title="Aún no tienes facturas"
          description="Las facturas se generan desde órdenes de trabajo completadas y facturables, o desde una cotización aceptada."
          actions={
            <Button asChild variant="outline">
              <Link href={`/app/${tenantSlug}/quotes`}>Ir a cotizaciones</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">N.º</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Creada</th>
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
                        {inv.invoiceNumber ?? "Borrador"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {inv.companyId && inv.companyName ? (
                        <Link href={`/app/${tenantSlug}/companies/${inv.companyId}`} className="hover:underline">
                          {inv.companyName}
                        </Link>
                      ) : (
                        (inv.companyName ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status]}`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCOP(inv.totalAmount)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${isOverdue(inv) ? "font-semibold text-destructive" : ""}`}>
                      {formatCOP(inv.balance)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.dueDate ? (
                        isOverdue(inv) ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-destructive">{formatDateNumeric(inv.dueDate)}</span>
                            <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                              Vencida
                            </span>
                          </span>
                        ) : (
                          formatDateNumeric(inv.dueDate)
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateNumeric(inv.createdAt)}
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
    </>
  )
}
