import type { CustomerRevenueTimeline } from "@/modules/billing/domain/revenue-timeline"
import type { UUID } from "@/types/shared"

export interface RevenueTimelineRepository {
  /**
   * Consolidated economic timeline for a customer (company): quotes, work orders,
   * invoices and payments merged chronologically, plus the invoiced/paid/balance
   * summary. Read-only and derived.
   */
  getForCompany(
    tenantId: UUID,
    companyId: UUID,
  ): Promise<CustomerRevenueTimeline>
}
