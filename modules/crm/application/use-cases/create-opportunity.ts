import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import type {
  Opportunity,
  OpportunityInput,
} from "@/modules/crm/domain/opportunity"
import type { UUID } from "@/types/shared"

export type CreateOpportunityDeps = {
  opportunities: OpportunityRepository
  audit: AuditRepository
}

export type CreateOpportunityInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  ownerId: UUID | null
  data: OpportunityInput
}

export async function createOpportunity(
  { opportunities, audit }: CreateOpportunityDeps,
  input: CreateOpportunityInput,
): Promise<Opportunity> {
  // Default the owner to the creating user when none is provided.
  const ownerId = input.ownerId ?? input.actorId

  const opportunity = await opportunities.create(
    input.tenantId,
    ownerId,
    input.data,
  )

  await audit.append({
    eventType: "crm.opportunity.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "opportunity",
    subjectId: opportunity.id,
    action: "opportunity.created",
    metadata: {
      name: opportunity.name,
      businessType: opportunity.businessType,
      companyId: opportunity.companyId,
      contactId: opportunity.contactId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return opportunity
}
