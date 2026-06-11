import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import {
  isInvoiceMutable,
  type InvoiceLine,
  type InvoiceLineInput,
} from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type AddInvoiceLineDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type AddInvoiceLineInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  invoiceId: UUID
  data: InvoiceLineInput
}

/** E1-H2 — add a line to a draft invoice and recalculate totals. */
export async function addInvoiceLine(
  { invoices, audit }: AddInvoiceLineDeps,
  input: AddInvoiceLineInput,
): Promise<InvoiceLine> {
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

  const line = await invoices.addLine(
    input.tenantId,
    input.invoiceId,
    input.data,
  )
  await invoices.recalculateTotals(input.tenantId, input.invoiceId)

  await audit.append({
    eventType: "invoice.line.added",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: input.invoiceId,
    action: "invoice.line.added",
    metadata: { lineId: line.id, lineTotal: line.lineTotal },
    requestId: input.requestId,
    source: "web",
  })

  return line
}
