import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import type { Invoice } from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type GenerateInvoiceFromWorkOrderDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type GenerateInvoiceFromWorkOrderInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  workOrderId: UUID
}

/**
 * E1-H1 — generate a draft invoice from a billable Work Order.
 * CA4: a work order with an existing non-void invoice cannot be re-invoiced.
 */
export async function generateInvoiceFromWorkOrder(
  { invoices, audit }: GenerateInvoiceFromWorkOrderDeps,
  input: GenerateInvoiceFromWorkOrderInput,
): Promise<Invoice> {
  const existing = await invoices.findActiveByWorkOrder(
    input.tenantId,
    input.workOrderId,
  )
  if (existing) {
    throw new ApplicationError(
      "This work order already has an active invoice.",
      "INVOICE_ALREADY_EXISTS",
    )
  }

  const invoice = await invoices.createFromWorkOrder(
    input.tenantId,
    input.workOrderId,
  )

  await audit.append({
    eventType: "invoice.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: invoice.id,
    action: "invoice.created",
    metadata: {
      originType: invoice.originType,
      workOrderId: input.workOrderId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return invoice
}
