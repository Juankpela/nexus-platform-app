import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import type {
  Opportunity,
  OpportunityFilters,
} from "@/modules/crm/domain/opportunity"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export function listOpportunities(
  opportunities: OpportunityRepository,
  tenantId: UUID,
  filters: OpportunityFilters,
  page: number,
  pageSize: number,
): Promise<Paginated<Opportunity>> {
  return opportunities.list(tenantId, filters, page, pageSize)
}
