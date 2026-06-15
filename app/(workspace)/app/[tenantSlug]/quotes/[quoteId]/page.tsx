import { Download } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  getQuoteRecord,
  listCompanyOptions,
  listContactOptions,
  listQuoteLines,
  listQuoteOpportunityOptions,
  listQuotePriceBookOptions,
  listQuoteProductLineOptions,
  listSubjectAuditEvents,
} from "@/modules/crm/composition"
import {
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from "@/modules/crm/domain/quote"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { QuoteDetailActions } from "./_components/quote-detail-actions"
import { GenerateWorkOrderButton } from "./_components/generate-work-order-button"
import { GenerateInvoiceFromQuoteButton } from "./_components/generate-invoice-button"

export const metadata: Metadata = { title: "Quote Detail" }

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; quoteId: string }>
}) {
  const { tenantSlug, quoteId } = await params
  const context = await getRequestContext(tenantSlug)
  requirePermission(context.effectivePermissions, CRM_PERMISSIONS.quotesRead)

  const canWrite = hasPermission(
    context.effectivePermissions,
    CRM_PERMISSIONS.quotesWrite,
  )
  const canCreateWorkOrder = hasPermission(
    context.effectivePermissions,
    SERVICE_PERMISSIONS.workOrdersWrite,
  )
  const canCreateInvoice = hasPermission(
    context.effectivePermissions,
    BILLING_PERMISSIONS.invoicesWrite,
  )

  const [quote, lines, companies, contacts, opportunities, priceBooks, auditEvents] =
    await Promise.all([
      getQuoteRecord(context.tenantId, quoteId),
      listQuoteLines(context.tenantId, quoteId),
      canWrite ? listCompanyOptions(context.tenantId) : Promise.resolve([]),
      canWrite ? listContactOptions(context.tenantId) : Promise.resolve([]),
      canWrite
        ? listQuoteOpportunityOptions(context.tenantId)
        : Promise.resolve([]),
      canWrite
        ? listQuotePriceBookOptions(context.tenantId)
        : Promise.resolve([]),
      listSubjectAuditEvents(context.tenantId, quoteId, 20),
    ])

  if (!quote) notFound()

  const products = canWrite
    ? await listQuoteProductLineOptions(context.tenantId, quote.priceBookId)
    : []

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <div className="space-y-6 p-5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {quote.quoteNumber} · v{quote.version}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLORS[quote.status]}`}
            >
              {QUOTE_STATUS_LABELS[quote.status]}
            </span>
          </div>
          {quote.companyName && (
            <p className="mt-1 text-sm text-muted-foreground">
              {quote.companyName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreateWorkOrder && quote.status === "accepted" && (
            <GenerateWorkOrderButton tenantSlug={tenantSlug} quoteId={quoteId} />
          )}
          {canCreateInvoice && quote.status === "accepted" && (
            <GenerateInvoiceFromQuoteButton
              tenantSlug={tenantSlug}
              quoteId={quoteId}
            />
          )}
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/app/${tenantSlug}/quotes/${quoteId}/pdf`}
              target="_blank"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Link>
          </Button>
        </div>
      </div>

      {/* Status control + edit + revision */}
      {canWrite && (
        <QuoteDetailActions
          tenantSlug={tenantSlug}
          quote={quote}
          lines={lines}
          products={products}
          companies={companies}
          contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
          opportunities={opportunities}
          priceBooks={priceBooks}
        />
      )}

      {/* Quote info */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Quote Details</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quote.opportunityName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Opportunity
              </dt>
              <dd className="mt-0.5 text-sm">{quote.opportunityName}</dd>
            </div>
          )}
          {quote.contactName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Contact
              </dt>
              <dd className="mt-0.5 text-sm">{quote.contactName}</dd>
            </div>
          )}
          {quote.priceBookName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Price Book
              </dt>
              <dd className="mt-0.5 text-sm">{quote.priceBookName}</dd>
            </div>
          )}
          {quote.expirationDate && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Expires
              </dt>
              <dd className="mt-0.5 text-sm">
                {new Date(quote.expirationDate).toLocaleDateString(undefined, { timeZone: "America/Bogota" })}
              </dd>
            </div>
          )}
          {quote.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Notes
              </dt>
              <dd className="mt-0.5 text-sm whitespace-pre-line">
                {quote.notes}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Lines */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            Line Items{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({lines.length})
            </span>
          </h2>
        </div>
        {lines.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No line items yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">
                  Unit Price
                </th>
                <th className="px-4 py-3 font-medium text-right">Discount</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{l.productName}</p>
                    {l.productSku && (
                      <p className="text-xs text-muted-foreground">
                        {l.productSku}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.quantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmt(l.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.discountAmount > 0 ? fmt(l.discountAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {fmt(l.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals */}
      <div className="ml-auto max-w-xs space-y-2 rounded-xl border bg-card p-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{fmt(quote.subtotal)}</span>
        </div>
        {quote.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="tabular-nums text-destructive">
              −{fmt(quote.discountAmount)}
            </span>
          </div>
        )}
        {quote.taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{fmt(quote.taxAmount)}</span>
          </div>
        )}
        <div className="border-t pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{fmt(quote.totalAmount)}</span>
        </div>
      </div>

      {/* Audit history */}
      {auditEvents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Audit History</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditEvents.map((ev) => (
                  <tr key={ev.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{ev.action}</p>
                      {ev.actorId && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          by {ev.actorType}:{ev.actorId.slice(0, 8)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(ev.occurredAt).toLocaleString(undefined, { timeZone: "America/Bogota" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
