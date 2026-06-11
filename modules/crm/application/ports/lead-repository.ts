import type {
  Lead,
  LeadFunnelMetrics,
  LeadInput,
  LeadListQuery,
  LeadStatus,
} from "@/modules/crm/domain/lead"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface LeadRepository {
  list(tenantId: UUID, query: LeadListQuery): Promise<Paginated<Lead>>
  getById(tenantId: UUID, id: UUID): Promise<Lead | null>
  create(tenantId: UUID, ownerId: UUID, input: LeadInput): Promise<Lead>
  update(tenantId: UUID, id: UUID, input: LeadInput): Promise<Lead>
  setStatus(tenantId: UUID, id: UUID, status: LeadStatus): Promise<void>
  /** Conversion: mark the lead converted and link the generated opportunity. */
  markConverted(
    tenantId: UUID,
    id: UUID,
    opportunityId: UUID,
    convertedAt: string,
  ): Promise<void>
  getFunnelMetrics(tenantId: UUID): Promise<LeadFunnelMetrics>
}
