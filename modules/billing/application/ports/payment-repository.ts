import type {
  OpenInvoiceOption,
  Payment,
  PaymentDetail,
  PaymentListItem,
  PaymentListQuery,
  RecordPaymentInput,
} from "@/modules/billing/domain/payment"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface PaymentRepository {
  list(
    tenantId: UUID,
    query: PaymentListQuery,
  ): Promise<Paginated<PaymentListItem>>
  getById(tenantId: UUID, id: UUID): Promise<PaymentDetail | null>

  /** Allocations applied to a given invoice (for the invoice detail / timeline). */
  listForInvoice(tenantId: UUID, invoiceId: UUID): Promise<PaymentDetail[]>

  /** Issued/partially-paid invoices of a company with an outstanding balance. */
  listOpenInvoices(
    tenantId: UUID,
    companyId: UUID,
  ): Promise<OpenInvoiceOption[]>

  /**
   * E3-H1/H2 — record a payment and apply it to one or more invoices, updating
   * each invoice's amount_paid and status. Application-layer sequencing (not an
   * atomic RPC); see migration note on accepted non-atomicity.
   */
  record(tenantId: UUID, input: RecordPaymentInput): Promise<Payment>

  /** E3-H3 — reverse a recorded payment, recomputing affected invoice balances. */
  reverse(
    tenantId: UUID,
    id: UUID,
    reversedBy: UUID,
    reversedAt: string,
    reason: string,
  ): Promise<void>
}
