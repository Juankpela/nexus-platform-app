import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import type { Lead, LeadListQuery } from "@/modules/crm/domain/lead"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export function listLeads(
  leads: LeadRepository,
  tenantId: UUID,
  query: LeadListQuery,
): Promise<Paginated<Lead>> {
  return leads.list(tenantId, query)
}
