import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import {
  isInvoiceMutable,
  type Invoice,
  type InvoiceDraftInput,
} from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type UpdateInvoiceDraftDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type UpdateInvoiceDraftInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: InvoiceDraftInput
}

/** E1-H2 — edit a draft invoice's header. Issued invoices are immutable. */
export async function updateInvoiceDraft(
  { invoices, audit }: UpdateInvoiceDraftDeps,
  input: UpdateInvoiceDraftInput,
): Promise<Invoice> {
  const current = await invoices.getById(input.tenantId, input.id)
  if (!current) {
    throw new ApplicationError("Invoice not found.", "INVOICE_NOT_FOUND")
  }
  if (!isInvoiceMutable(current.status)) {
    throw new ApplicationError(
      "Only draft invoices can be edited.",
      "INVOICE_NOT_EDITABLE",
    )
  }

  const invoice = await invoices.updateDraft(
    input.tenantId,
    input.id,
    input.data,
  )

  await audit.append({
    eventType: "invoice.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: invoice.id,
    action: "invoice.updated",
    metadata: {},
    requestId: input.requestId,
    source: "web",
  })

  return invoice
}
