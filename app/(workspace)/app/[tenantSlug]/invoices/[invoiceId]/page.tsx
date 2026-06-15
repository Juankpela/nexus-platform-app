import { Mail } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { SendDocumentEmailDialog } from "@/components/email/send-document-email-dialog"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getInvoiceRecord,
  listInvoiceLines,
  listInvoicePayments,
} from "@/modules/billing/composition"
import { getContactRecord } from "@/modules/crm/composition"
import { sendInvoiceEmailAction } from "@/modules/billing/presentation/invoice-actions"
import {
  INVOICE_ORIGIN_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
} from "@/modules/billing/domain/invoice"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { InvoiceDetailActions } from "./_components/invoice-detail-actions"
import { InvoicePaymentsSection } from "./_components/invoice-payments-section"

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

  // Prefill the email recipient from the linked contact (Inc 3).
  const contact = invoice.contactId
    ? await getContactRecord(context.tenantId, invoice.contactId)
    : null
  const invoiceNumber = invoice.invoiceNumber ?? "—"
  const emailDefaults = {
    to: contact?.email ?? "",
    subject: `Factura ${invoiceNumber} - ${context.tenant.name}`,
    message: `Hola,\n\nAdjuntamos la factura ${invoiceNumber}. Quedamos atentos a cualquier inquietud.\n\nSaludos,\n${context.tenant.name}`,
  }

  const canPaymentsRead = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.paymentsRead,
  )
  const canPaymentsWrite = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.paymentsWrite,
  )
  const payments = canPaymentsRead
    ? await listInvoicePayments(context.tenantId, invoiceId)
    : []

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
            {invoice.workOrderNumber
              ? ` ${invoice.workOrderNumber}`
              : invoice.quoteNumber
                ? ` ${invoice.quoteNumber}`
                : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/app/${tenantSlug}/invoices/${invoice.id}/pdf`}
              target="_blank"
            >
              Descargar PDF
            </Link>
          </Button>
          {canWrite ? (
            <SendDocumentEmailDialog
              tenantSlug={tenantSlug}
              documentId={invoice.id}
              defaultTo={emailDefaults.to}
              defaultSubject={emailDefaults.subject}
              defaultMessage={emailDefaults.message}
              action={sendInvoiceEmailAction}
              trigger={
                <Button size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por email
                </Button>
              }
            />
          ) : null}
          <Button asChild size="sm" variant="ghost">
            <Link href={`/app/${tenantSlug}/invoices`}>← Back to invoices</Link>
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Issue date</div>
          <div>{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString(undefined, { timeZone: "America/Bogota" }) : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Due date</div>
          <div>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString(undefined, { timeZone: "America/Bogota" }) : "—"}</div>
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
      {invoice.status === "draft" && lines.length === 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Esta factura no contiene líneas cobrables.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            La orden de trabajo no registró materiales ni horas. Agregue líneas
            manualmente antes de emitir la factura.
          </p>
        </div>
      )}

      <InvoiceDetailActions
        tenantSlug={tenantSlug}
        invoice={invoice}
        lines={lines}
        canWrite={canWrite}
        canIssue={canIssue}
        canVoid={canVoid}
      />

      {canPaymentsRead && invoice.status !== "draft" && invoice.status !== "void" ? (
        <InvoicePaymentsSection
          tenantSlug={tenantSlug}
          invoiceId={invoice.id}
          companyId={invoice.companyId}
          balance={invoice.balance}
          status={invoice.status}
          payments={payments}
          canWrite={canPaymentsWrite}
        />
      ) : null}
    </div>
  )
}
