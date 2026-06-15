import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ApprovalActions } from "./_components/approval-actions"
import { getPublicQuoteView } from "@/modules/crm/composition"
import type { QuoteStatus } from "@/modules/crm/domain/quote"
import { getTenantBusinessProfile } from "@/modules/tenancy/composition"

export const metadata: Metadata = { title: "Cotización" }
export const dynamic = "force-dynamic"

const STATUS_ES: Record<QuoteStatus, string> = {
  draft: "Borrador",
  pending_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  rejected: "Rechazada",
  sent: "Enviada",
  accepted: "Aprobada",
  expired: "Vencida",
}
const FINAL = new Set<QuoteStatus>(["accepted", "rejected", "expired"])

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const view = await getPublicQuoteView(token)
  if (!view) notFound()

  const { quote, lines, tenantId, tenantName } = view
  const issuer = await getTenantBusinessProfile(tenantId)
  const isFinal = FINAL.has(quote.status)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        {/* Header: issuer */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <p className="text-xl font-bold text-primary">
              {issuer.legalName ?? tenantName}
            </p>
            {issuer.taxId ? <p className="mt-1 text-sm text-muted-foreground">NIT: {issuer.taxId}</p> : null}
            {issuer.phone ? <p className="text-sm text-muted-foreground">Tel: {issuer.phone}</p> : null}
            {issuer.address ? <p className="text-sm text-muted-foreground">{issuer.address}</p> : null}
            {issuer.email ? <p className="text-sm text-muted-foreground">{issuer.email}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">COTIZACIÓN</p>
            <p className="text-sm text-muted-foreground">
              {quote.quoteNumber} · v{quote.version}
            </p>
            <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {STATUS_ES[quote.status]}
            </span>
          </div>
        </div>

        {/* Client */}
        {quote.companyName ? (
          <div className="py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Para</p>
            <p className="mt-1 font-medium">{quote.companyName}</p>
            {quote.contactName ? (
              <p className="text-sm text-muted-foreground">{quote.contactName}</p>
            ) : null}
          </div>
        ) : null}

        {/* Items */}
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Cant.</th>
                <th className="px-3 py-2 text-right font-medium">Precio unit.</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2">
                    {l.productName}
                    {l.productSku ? (
                      <span className="block text-xs text-muted-foreground">{l.productSku}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money.format(l.unitPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money.format(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{money.format(quote.subtotal)}</span>
          </div>
          {quote.discountAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="tabular-nums">−{money.format(quote.discountAmount)}</span>
            </div>
          ) : null}
          {quote.taxAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impuesto</span>
              <span className="tabular-nums">{money.format(quote.taxAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{money.format(quote.totalAmount)}</span>
          </div>
        </div>

        {quote.notes ? (
          <div className="mt-6 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
            {quote.notes}
          </div>
        ) : null}

        {/* Decision */}
        <div className="mt-8 border-t pt-6">
          {isFinal ? (
            <p className="text-center text-sm text-muted-foreground">
              Esta cotización está marcada como{" "}
              <span className="font-medium text-foreground">{STATUS_ES[quote.status]}</span>.
            </p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                ¿Apruebas esta cotización?
              </p>
              <ApprovalActions token={token} />
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Generado con NEXUS
      </p>
    </main>
  )
}
