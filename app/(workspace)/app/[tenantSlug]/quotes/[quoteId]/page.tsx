import { Download, Mail } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CopyApprovalLink } from "@/components/crm/copy-approval-link"
import { SendDocumentEmailDialog } from "@/components/email/send-document-email-dialog"
import { Button } from "@/components/ui/button"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import {
  ensureQuotePublicToken,
  getContactRecord,
  getQuoteRecord,
  listCompanyOptions,
  listContactOptions,
  listQuoteLines,
  listQuoteOpportunityOptions,
  listQuotePriceBookOptions,
  listQuoteProductLineOptions,
  listSubjectAuditEvents,
} from "@/modules/crm/composition"
import { sendQuoteEmailAction } from "@/modules/crm/presentation/quote-actions"
import {
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from "@/modules/crm/domain/quote"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { formatDateNumeric, formatDateTime } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
import { QuoteDetailActions } from "./_components/quote-detail-actions"
import { GenerateWorkOrderButton } from "./_components/generate-work-order-button"
import { GenerateInvoiceFromQuoteButton } from "./_components/generate-invoice-button"

export const metadata: Metadata = { title: "Detalle de cotización" }

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

  // Prefill the email recipient from the linked contact (Inc 3).
  const contact = quote.contactId
    ? await getContactRecord(context.tenantId, quote.contactId)
    : null

  // Public approval link (Inc 4): ensure a token exists and build the URL.
  const publicToken = await ensureQuotePublicToken(context.tenantId, quoteId)
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const approvalUrl = `${appUrl}/q/${publicToken}`

  const emailDefaults = {
    to: contact?.email ?? "",
    subject: `Cotización ${quote.quoteNumber} - ${context.tenant.name}`,
    message: `Hola,\n\nAdjuntamos la cotización ${quote.quoteNumber}. Puedes revisarla y aprobarla aquí:\n${approvalUrl}\n\nQuedamos atentos a cualquier inquietud.\n\nSaludos,\n${context.tenant.name}`,
  }

  const products = canWrite
    ? await listQuoteProductLineOptions(context.tenantId, quote.priceBookId)
    : []

  const fmt = (n: number) => formatCOP(n)

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
          {canWrite ? <CopyApprovalLink url={approvalUrl} /> : null}
          {canWrite ? (
            <SendDocumentEmailDialog
              tenantSlug={tenantSlug}
              documentId={quoteId}
              defaultTo={emailDefaults.to}
              defaultSubject={emailDefaults.subject}
              defaultMessage={emailDefaults.message}
              action={sendQuoteEmailAction}
              trigger={
                <Button size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por email
                </Button>
              }
            />
          ) : null}
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
        <h2 className="mb-4 text-base font-semibold">Detalles de la cotización</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quote.opportunityName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Oportunidad
              </dt>
              <dd className="mt-0.5 text-sm">{quote.opportunityName}</dd>
            </div>
          )}
          {quote.contactName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Contacto
              </dt>
              <dd className="mt-0.5 text-sm">{quote.contactName}</dd>
            </div>
          )}
          {quote.priceBookName && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Lista de precios
              </dt>
              <dd className="mt-0.5 text-sm">{quote.priceBookName}</dd>
            </div>
          )}
          {quote.expirationDate && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Vence
              </dt>
              <dd className="mt-0.5 text-sm">
                {formatDateNumeric(quote.expirationDate)}
              </dd>
            </div>
          )}
          {quote.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Notas
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
            Ítems{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({lines.length})
            </span>
          </h2>
        </div>
        {lines.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aún no hay ítems.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium text-right">Cant.</th>
                <th className="px-4 py-3 font-medium text-right">
                  Precio unit.
                </th>
                <th className="px-4 py-3 font-medium text-right">Descuento</th>
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
            <span className="text-muted-foreground">Descuento</span>
            <span className="tabular-nums text-destructive">
              −{fmt(quote.discountAmount)}
            </span>
          </div>
        )}
        {quote.taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Impuesto</span>
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
          <h2 className="text-base font-semibold">Historial de cambios</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Cuándo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditEvents.map((ev) => (
                  <tr key={ev.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{ev.action}</p>
                      {ev.actorId && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          por {ev.actorType}:{ev.actorId.slice(0, 8)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(ev.occurredAt)}
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
