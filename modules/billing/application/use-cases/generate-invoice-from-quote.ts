import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import type { Invoice } from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type GenerateInvoiceFromQuoteDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type GenerateInvoiceFromQuoteInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  quoteId: UUID
}

/**
 * Generate a draft invoice from an accepted Quote (product sale, Flujo A).
 * One non-void invoice per quote. Seeds product lines at agreed prices.
 */
export async function generateInvoiceFromQuote(
  { invoices, audit }: GenerateInvoiceFromQuoteDeps,
  input: GenerateInvoiceFromQuoteInput,
): Promise<Invoice> {
  const existing = await invoices.findActiveByQuote(
    input.tenantId,
    input.quoteId,
  )
  if (existing) {
    throw new ApplicationError(
      "This quote already has an active invoice.",
      "INVOICE_ALREADY_EXISTS",
    )
  }

  const invoice = await invoices.createFromQuote(input.tenantId, input.quoteId)

  await audit.append({
    eventType: "invoice.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: invoice.id,
    action: "invoice.created",
    metadata: { originType: invoice.originType, quoteId: input.quoteId },
    requestId: input.requestId,
    source: "web",
  })

  return invoice
}
