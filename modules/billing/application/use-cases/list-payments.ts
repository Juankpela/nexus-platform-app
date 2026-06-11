import type { PaymentRepository } from "@/modules/billing/application/ports/payment-repository"
import type {
  PaymentListItem,
  PaymentListQuery,
} from "@/modules/billing/domain/payment"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

/** Lists payments for a tenant (payments list and Revenue Timeline). */
export function listPayments(
  payments: PaymentRepository,
  tenantId: UUID,
  query: PaymentListQuery,
): Promise<Paginated<PaymentListItem>> {
  return payments.list(tenantId, query)
}
