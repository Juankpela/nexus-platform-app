import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import { isInvoiceMutable } from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type RemoveInvoiceLineDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type RemoveInvoiceLineInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  invoiceId: UUID
  lineId: UUID
}

/** E1-H2 — remove a line from a draft invoice and recalculate totals. */
export async function removeInvoiceLine(
  { invoices, audit }: RemoveInvoiceLineDeps,
  input: RemoveInvoiceLineInput,
): Promise<void> {
  const current = await invoices.getById(input.tenantId, input.invoiceId)
  if (!current) {
    throw new ApplicationError("Invoice not found.", "INVOICE_NOT_FOUND")
  }
  if (!isInvoiceMutable(current.status)) {
    throw new ApplicationError(
      "Only draft invoices can be edited.",
      "INVOICE_NOT_EDITABLE",
    )
  }

  await invoices.removeLine(input.tenantId, input.lineId)
  await invoices.recalculateTotals(input.tenantId, input.invoiceId)

  await audit.append({
    eventType: "invoice.line.removed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: input.invoiceId,
    action: "invoice.line.removed",
    metadata: { lineId: input.lineId },
    requestId: input.requestId,
    source: "web",
  })
}
