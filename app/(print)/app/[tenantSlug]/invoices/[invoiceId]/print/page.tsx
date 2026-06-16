import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PrintButton } from "./_components/print-button"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getInvoiceRecord, listInvoiceLines } from "@/modules/billing/composition"
import {
  INVOICE_ORIGIN_LABELS,
  INVOICE_STATUS_LABELS,
} from "@/modules/billing/domain/invoice"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Factura" }

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; invoiceId: string }>
}) {
  const { tenantSlug, invoiceId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesRead,
  )

  const [invoice, lines] = await Promise.all([
    getInvoiceRecord(context.tenantId, invoiceId),
    listInvoiceLines(context.tenantId, invoiceId),
  ])

  if (!invoice) notFound()

  const fmt = (n: number) =>
    n.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Bogota",
    })

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; font-size: 14px; color: #111; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .doc-meta { text-align: right; }
        .doc-meta h1 { font-size: 18px; font-weight: 700; }
        .doc-meta p { font-size: 12px; color: #666; margin-top: 4px; }
        .draft-badge { display: inline-block; margin-top: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; color: #92400e; background: #fef3c7; border-radius: 999px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 6px; }
        .section-value { font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { border-bottom: 2px solid #ddd; padding: 8px 0; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
        th.right, td.right { text-align: right; }
        td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
        .totals { margin-left: auto; width: 260px; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .total-row.grand { font-weight: 700; font-size: 15px; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 4px; }
        .total-row.balance { font-weight: 700; font-size: 14px; border-top: 1px solid #eee; padding-top: 8px; margin-top: 4px; }
        .notes { margin-top: 32px; padding: 16px; background: #f9f9f9; border-radius: 6px; }
        .notes p { white-space: pre-line; font-size: 13px; color: #555; margin-top: 6px; }
        .footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; }
        @media print {
          .page { padding: 0; }
          @page { margin: 24mm 20mm; }
        }
      `}</style>

      <PrintButton />

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="brand">{context.tenant.name}</div>
          <div className="doc-meta">
            <h1>{invoice.invoiceNumber ?? "Factura"}</h1>
            <p>Estado: {INVOICE_STATUS_LABELS[invoice.status]}</p>
            {invoice.issueDate && <p>Emisión: {longDate(invoice.issueDate)}</p>}
            {invoice.dueDate && <p>Vence: {longDate(invoice.dueDate)}</p>}
            <p>Moneda: {invoice.currency}</p>
            {!invoice.invoiceNumber && (
              <span className="draft-badge">BORRADOR — sin número fiscal</span>
            )}
          </div>
        </div>

        {/* Parties + origin */}
        <div className="parties">
          <div>
            <div className="section-label">Facturar a</div>
            <div className="section-value">{invoice.companyName ?? "—"}</div>
            {invoice.contactName && (
              <div className="section-value" style={{ color: "#555", marginTop: 4 }}>
                {invoice.contactName}
              </div>
            )}
          </div>
          <div>
            <div className="section-label">Origen</div>
            <div className="section-value">
              {INVOICE_ORIGIN_LABELS[invoice.originType]}
              {invoice.workOrderNumber
                ? ` ${invoice.workOrderNumber}`
                : invoice.quoteNumber
                  ? ` ${invoice.quoteNumber}`
                  : ""}
            </div>
            {invoice.paymentTerms && (
              <div className="section-value" style={{ color: "#555", marginTop: 4 }}>
                {invoice.paymentTerms}
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <table>
          <thead>
            <tr>
              <th style={{ width: "44%" }}>Descripción</th>
              <th className="right" style={{ width: "10%" }}>Cant.</th>
              <th className="right" style={{ width: "16%" }}>Unitario</th>
              <th className="right" style={{ width: "14%" }}>Impuesto</th>
              <th className="right" style={{ width: "16%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.description}</td>
                <td className="right">{l.quantity}</td>
                <td className="right">{fmt(l.unitPrice)}</td>
                <td className="right">{l.taxAmount > 0 ? fmt(l.taxAmount) : "—"}</td>
                <td className="right">{fmt(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{fmt(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="total-row">
              <span>Impuesto</span>
              <span>{fmt(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="total-row grand">
            <span>Total</span>
            <span>{fmt(invoice.totalAmount)}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div className="total-row">
              <span>Pagado</span>
              <span>−{fmt(invoice.amountPaid)}</span>
            </div>
          )}
          <div className="total-row balance">
            <span>Saldo</span>
            <span>{fmt(invoice.balance)}</span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="notes">
            <div className="section-label">Notas</div>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="footer">
          Generado por Nexus · {invoice.invoiceNumber ?? "Borrador"}
        </div>
      </div>
    </>
  )
}
