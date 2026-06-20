import Link from "next/link"

import {
  INVOICE_STATUSES,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  type InvoiceListItem,
} from "@/modules/billing/domain/invoice"
import { formatDateNumeric } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"

/**
 * Tablero Kanban de facturas por estado (solo lectura). Columnas = estados del
 * ciclo de la factura; cada tarjeta enlaza al detalle. Pensado para la gestión de
 * admin/supervisor: identificar de un vistazo qué hay en borrador, emitido, por
 * cobrar, pagado o anulado. Los cambios de estado siguen ocurriendo desde el
 * detalle (emitir/registrar pago/anular), no arrastrando tarjetas.
 */
export function InvoiceKanban({
  tenantSlug,
  invoices,
}: {
  tenantSlug: string
  invoices: InvoiceListItem[]
}) {
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const isOverdue = (inv: InvoiceListItem) =>
    (inv.status === "issued" || inv.status === "partially_paid") &&
    inv.balance > 0 &&
    inv.dueDate != null &&
    inv.dueDate < todayISO

  const byStatus = new Map<string, InvoiceListItem[]>()
  for (const inv of invoices) {
    const bucket = byStatus.get(inv.status)
    if (bucket) bucket.push(inv)
    else byStatus.set(inv.status, [inv])
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {INVOICE_STATUSES.map((status) => {
        const cards = byStatus.get(status) ?? []
        const columnTotal = cards.reduce((sum, c) => sum + c.totalAmount, 0)
        return (
          <div key={status} className="flex w-72 shrink-0 flex-col">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[status]}`}
              >
                {INVOICE_STATUS_LABELS[status]}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </div>

            <div className="flex min-h-16 flex-1 flex-col gap-2 rounded-xl border bg-muted/20 p-2">
              {cards.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Sin facturas
                </p>
              ) : (
                cards.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/app/${tenantSlug}/invoices/${inv.id}`}
                    className="block rounded-lg border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {inv.invoiceNumber ?? "Borrador"}
                      </span>
                      <span className="tabular-nums font-semibold text-foreground">
                        {formatCOP(inv.totalAmount)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {inv.companyName ?? "—"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {formatDateNumeric(inv.createdAt)}
                      </span>
                      {inv.balance > 0 ? (
                        <span
                          className={
                            isOverdue(inv)
                              ? "font-medium text-destructive"
                              : "text-muted-foreground"
                          }
                        >
                          {isOverdue(inv) ? "Vencida · " : "Saldo "}
                          {formatCOP(inv.balance)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>

            {columnTotal > 0 ? (
              <p className="mt-2 px-1 text-right text-xs tabular-nums text-muted-foreground">
                {formatCOP(columnTotal)}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
