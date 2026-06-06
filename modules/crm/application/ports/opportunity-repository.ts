import type {
  Opportunity,
  OpportunityFilters,
  OpportunityInput,
  OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface OpportunityRepository {
  list(
    tenantId: UUID,
    filters: OpportunityFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Opportunity>>
  getById(tenantId: UUID, id: UUID): Promise<Opportunity | null>
  create(
    tenantId: UUID,
    ownerId: UUID,
    input: OpportunityInput,
  ): Promise<Opportunity>
  update(tenantId: UUID, id: UUID, input: OpportunityInput): Promise<Opportunity>
  setStatus(tenantId: UUID, id: UUID, status: OpportunityStatus): Promise<void>
  setOwner(tenantId: UUID, id: UUID, ownerId: UUID | null): Promise<void>
}
