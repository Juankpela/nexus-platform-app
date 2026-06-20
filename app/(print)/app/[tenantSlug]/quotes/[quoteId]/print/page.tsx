import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PrintButton } from "./_components/print-button"

import { requirePermission } from "@/modules/authorization/application/require-permission"
import { CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import {
  getQuoteRecord,
  listQuoteLines,
} from "@/modules/crm/composition"
import { QUOTE_STATUS_LABELS } from "@/modules/crm/domain/quote"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export const metadata: Metadata = { title: "Cotización" }

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; quoteId: string }>
}) {
  const { tenantSlug, quoteId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.quotesRead)

  const [quote, lines] = await Promise.all([
    getQuoteRecord(context.tenantId, quoteId),
    listQuoteLines(context.tenantId, quoteId),
  ])

  if (!quote) notFound()

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; font-size: 14px; color: #111; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .quote-meta { text-align: right; }
        .quote-meta h1 { font-size: 18px; font-weight: 700; }
        .quote-meta p { font-size: 12px; color: #666; margin-top: 4px; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 6px; }
        .section-value { font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { border-bottom: 2px solid #ddd; padding: 8px 0; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
        th.right, td.right { text-align: right; }
        td { padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; vertical-align: top; }
        .product-sku { font-size: 11px; color: #888; margin-top: 2px; }
        .totals { margin-left: auto; width: 240px; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .total-row.grand { font-weight: 700; font-size: 15px; border-top: 2px solid #ddd; padding-top: 10px; margin-top: 4px; }
        .notes { margin-top: 32px; padding: 16px; background: #f9f9f9; border-radius: 6px; }
        .notes p { white-space: pre-line; font-size: 13px; color: #555; margin-top: 6px; }
        .footer { margin-top: 48px; font-size: 11px; color: #aaa; text-align: center; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; padding: 10px 20px; background: #111; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; z-index: 100; }
        @media print {
          .print-btn { display: none; }
          .page { padding: 0; }
          @page { margin: 24mm 20mm; }
        }
      `}</style>

      <PrintButton />

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="brand">{context.tenant.name}</div>
          <div className="quote-meta">
            <h1>
              {quote.quoteNumber} · v{quote.version}
            </h1>
            <p>Status: {QUOTE_STATUS_LABELS[quote.status]}</p>
            {quote.expirationDate && (
              <p>
                Expires:{" "}
                {new Date(quote.expirationDate).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "America/Bogota",
                })}
              </p>
            )}
            <p>
              Date:{" "}
              {new Date(quote.createdAt).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Bogota",
              })}
            </p>
          </div>
        </div>

        {/* Parties */}
        <div className="parties">
          {quote.companyName && (
            <div>
              <div className="section-label">Bill To</div>
              <div className="section-value">{quote.companyName}</div>
              {quote.contactName && (
                <div className="section-value" style={{ color: "#555", marginTop: 4 }}>
                  {quote.contactName}
                </div>
              )}
            </div>
          )}
          {quote.opportunityName && (
            <div>
              <div className="section-label">Opportunity</div>
              <div className="section-value">{quote.opportunityName}</div>
            </div>
          )}
        </div>

        {/* Line items */}
        <table>
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Producto</th>
              <th className="right" style={{ width: "10%" }}>Cant.</th>
              <th className="right" style={{ width: "18%" }}>Unit Price</th>
              <th className="right" style={{ width: "15%" }}>Discount</th>
              <th className="right" style={{ width: "17%" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.productName}
                  {l.productSku && (
                    <div className="product-sku">{l.productSku}</div>
                  )}
                </td>
                <td className="right">{l.quantity}</td>
                <td className="right">{fmt(l.unitPrice)}</td>
                <td className="right">
                  {l.discountAmount > 0 ? fmt(l.discountAmount) : "—"}
                </td>
                <td className="right">{fmt(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>{fmt(quote.subtotal)}</span>
          </div>
          {quote.discountAmount > 0 && (
            <div className="total-row">
              <span>Discount</span>
              <span>−{fmt(quote.discountAmount)}</span>
            </div>
          )}
          {quote.taxAmount > 0 && (
            <div className="total-row">
              <span>Tax</span>
              <span>{fmt(quote.taxAmount)}</span>
            </div>
          )}
          <div className="total-row grand">
            <span>Total</span>
            <span>{fmt(quote.totalAmount)}</span>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="notes">
            <div className="section-label">Notes</div>
            <p>{quote.notes}</p>
          </div>
        )}

        <div className="footer">
          Generated by Nexus · {quote.quoteNumber} v{quote.version}
        </div>
      </div>
    </>
  )
}
