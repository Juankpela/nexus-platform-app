import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getInvoiceRecord, listInvoiceLines } from "@/modules/billing/composition"
import {
  INVOICE_ORIGIN_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/modules/billing/domain/invoice"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { InvoiceDetailActions } from "./_components/invoice-detail-actions"

export const metadata: Metadata = { title: "Invoice" }

function money(n: number): string {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; invoiceId: string }>
}) {
  const { tenantSlug, invoiceId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, BILLING_PERMISSIONS.invoicesRead)

  const invoice = await getInvoiceRecord(context.tenantId, invoiceId)
  if (!invoice) notFound()

  const lines = await listInvoiceLines(context.tenantId, invoiceId)

  const canWrite = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesWrite,
  )
  const canIssue = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesIssue,
  )
  const canVoid = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesVoid,
  )

  return (
    <div className="space-y-6 p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {invoice.invoiceNumber ?? "Draft Invoice"}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[invoice.status]}`}
            >
              {INVOICE_STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.companyName ?? "—"} ·{" "}
            {INVOICE_ORIGIN_LABELS[invoice.originType]}
            {invoice.workOrderNumber ? ` ${invoice.workOrderNumber}` : ""}
          </p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/app/${tenantSlug}/invoices`}>← Back to invoices</Link>
        </Button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Issue date</div>
          <div>{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Due date</div>
          <div>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Terms</div>
          <div>{invoice.paymentTerms ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Currency</div>
          <div>{invoice.currency}</div>
        </div>
      </div>

      {/* Lines */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Unit</th>
              <th className="px-4 py-3 font-medium text-right">Disc.</th>
              <th className="px-4 py-3 font-medium text-right">Tax</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No lines yet.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">{l.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(l.unitPrice)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(l.discountAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(l.taxAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(l.lineTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="border-t bg-muted/20 text-sm">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Subtotal</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(invoice.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Tax</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(invoice.taxAmount)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={5} className="px-4 py-2 text-right">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(invoice.totalAmount)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-muted-foreground">Paid</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(invoice.amountPaid)}</td>
            </tr>
            <tr className="font-semibold">
              <td colSpan={5} className="px-4 py-2 text-right">Balance</td>
              <td className="px-4 py-2 text-right tabular-nums">{money(invoice.balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.notes && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="text-xs uppercase text-muted-foreground">Notes</div>
          <p className="mt-1 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {invoice.status === "void" && invoice.voidReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/40 dark:bg-red-950/20">
          <div className="text-xs uppercase text-red-700 dark:text-red-400">Void reason</div>
          <p className="mt-1">{invoice.voidReason}</p>
        </div>
      )}

      {/* Actions */}
      <InvoiceDetailActions
        tenantSlug={tenantSlug}
        invoice={invoice}
        lines={lines}
        canWrite={canWrite}
        canIssue={canIssue}
        canVoid={canVoid}
      />
    </div>
  )
}
