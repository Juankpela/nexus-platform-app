import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  Invoice,
  InvoiceDetail,
  InvoiceDraftInput,
  InvoiceLine,
  InvoiceLineInput,
  InvoiceListItem,
  InvoiceListQuery,
} from "@/modules/billing/domain/invoice"
import type { UUID } from "@/types/shared"

export interface InvoiceRepository {
  // ── Invoices ─────────────────────────────────────────────────────────────────
  list(
    tenantId: UUID,
    query: InvoiceListQuery,
  ): Promise<Paginated<InvoiceListItem>>
  getById(tenantId: UUID, id: UUID): Promise<InvoiceDetail | null>

  /**
   * E1-H1 — create a draft invoice from a Work Order (polymorphic origin:
   * work_order). Reads the WO header (company) to seed the invoice. Lines are
   * added in the draft (E1-H2); auto-population from billable WO lines is E2.
   */
  createFromWorkOrder(tenantId: UUID, workOrderId: UUID): Promise<Invoice>

  /** Guard for E1-H1 CA4 — an existing non-void invoice for this WO. */
  findActiveByWorkOrder(
    tenantId: UUID,
    workOrderId: UUID,
  ): Promise<Invoice | null>

  /**
   * Create a draft invoice from a Quote (product sale). Polymorphic origin: quote.
   * Seeds lines from the quote's PRODUCT lines at agreed prices (service lines flow
   * to a Work Order, not here). Does not create a Work Order or any intermediate.
   */
  createFromQuote(tenantId: UUID, quoteId: UUID): Promise<Invoice>

  /** Guard — an existing non-void invoice already generated from this quote. */
  findActiveByQuote(tenantId: UUID, quoteId: UUID): Promise<Invoice | null>

  /** E1-H2 — edit header fields (draft only; enforced in use-case). */
  updateDraft(
    tenantId: UUID,
    id: UUID,
    input: InvoiceDraftInput,
  ): Promise<Invoice>

  /** E1-H3 — assign consecutive fiscal number, set issued + issue date. */
  issue(tenantId: UUID, id: UUID, issueDate: string): Promise<Invoice>

  /** E1-H4 — void an issued invoice with a reason. */
  void(tenantId: UUID, id: UUID, reason: string): Promise<void>

  recalculateTotals(tenantId: UUID, invoiceId: UUID): Promise<void>

  // ── Lines ──────────────────────────────────────────────────────────────────
  listLines(tenantId: UUID, invoiceId: UUID): Promise<InvoiceLine[]>
  addLine(
    tenantId: UUID,
    invoiceId: UUID,
    input: InvoiceLineInput,
  ): Promise<InvoiceLine>
  updateLine(
    tenantId: UUID,
    lineId: UUID,
    input: InvoiceLineInput,
  ): Promise<InvoiceLine>
  removeLine(tenantId: UUID, lineId: UUID): Promise<void>
}
