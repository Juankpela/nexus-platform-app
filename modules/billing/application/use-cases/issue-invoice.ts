import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import {
  INVOICE_STATUS_TRANSITIONS,
  type Invoice,
} from "@/modules/billing/domain/invoice"
import { ApplicationError } from "@/lib/errors/application-error"
import type { UUID } from "@/types/shared"

export type IssueInvoiceDeps = {
  invoices: InvoiceRepository
  audit: AuditRepository
}

export type IssueInvoiceInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  /** Issue date (YYYY-MM-DD); supplied by the caller to avoid clock coupling. */
  issueDate: string
}

/**
 * E1-H3 — issue a draft invoice: assign the consecutive fiscal number and make it
 * immutable. Requires the `billing.invoices.issue` permission (gated in presentation).
 */
export async function issueInvoice(
  { invoices, audit }: IssueInvoiceDeps,
  input: IssueInvoiceInput,
): Promise<Invoice> {
  const current = await invoices.getById(input.tenantId, input.id)
  if (!current) {
    throw new ApplicationError("Invoice not found.", "INVOICE_NOT_FOUND")
  }
  if (!INVOICE_STATUS_TRANSITIONS[current.status].includes("issued")) {
    throw new ApplicationError(
      "Only draft invoices can be issued.",
      "INVOICE_NOT_ISSUABLE",
    )
  }
  if (current.totalAmount <= 0) {
    throw new ApplicationError(
      "Cannot issue an invoice with no billable lines.",
      "INVOICE_EMPTY",
    )
  }

  const invoice = await invoices.issue(input.tenantId, input.id, input.issueDate)

  await audit.append({
    eventType: "invoice.issued",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "invoice",
    subjectId: invoice.id,
    action: "invoice.issued",
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
    },
    requestId: input.requestId,
    source: "web",
  })

  return invoice
}
