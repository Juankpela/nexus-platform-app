import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import { canVoidInvoice } from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type VoidInvoiceDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type VoidInvoiceInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  reason: string
}

/**
 * E1-H4 — void an issued invoice with a reason. The consecutive number is kept.
 * An invoice with applied payments cannot be voided (reverse payments first).
 * Requires the `billing.invoices.void` permission (gated in presentation).
 */
export async function voidInvoice(
  { invoices, audit }: VoidInvoiceDeps,
  input: VoidInvoiceInput,
): Promise<void> {
  const reason = input.reason.trim()
  if (!reason) {
    throw new ApplicationError(
      "A reason is required to void an invoice.",
      "INVOICE_VOID_REASON_REQUIRED",
    )
  }

  const current = await invoices.getById(input.tenantId, input.id)
  if (!current) {
    throw new ApplicationError("Invoice not found.", "INVOICE_NOT_FOUND")
  }
  if (!canVoidInvoice(current.status)) {
    throw new ApplicationError(
      "Only issued invoices can be voided.",
      "INVOICE_NOT_VOIDABLE",
    )
  }
  if (current.amountPaid > 0) {
    throw new ApplicationError(
      "Cannot void an invoice with applied payments. Reverse the payments first.",
      "INVOICE_HAS_PAYMENTS",
    )
  }

  await invoices.void(input.tenantId, input.id, reason)

  await audit.append({
    eventType: "invoice.voided",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: input.id,
    action: "invoice.voided",
    metadata: { reason, invoiceNumber: current.invoiceNumber },
    requestId: input.requestId,
    source: "web",
  })
}
