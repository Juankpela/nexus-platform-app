import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import type {
  Opportunity,
  OpportunityInput,
} from "@/modules/crm/domain/opportunity"
import type { UUID } from "@/types/shared"

export type UpdateOpportunityDeps = {
  opportunities: OpportunityRepository
  audit: AuditRepository
}

export type UpdateOpportunityInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: OpportunityInput
}

export async function updateOpportunity(
  { opportunities, audit }: UpdateOpportunityDeps,
  input: UpdateOpportunityInput,
): Promise<Opportunity> {
  const existing = await opportunities.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError(
      "Opportunity not found.",
      "OPPORTUNITY_NOT_FOUND",
    )
  }

  const opportunity = await opportunities.update(
    input.tenantId,
    input.id,
    input.data,
  )

  await audit.append({
    eventType: "crm.opportunity.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "opportunity",
    subjectId: opportunity.id,
    action: "opportunity.updated",
    metadata: { name: opportunity.name },
    requestId: input.requestId,
    source: "web",
  })

  return opportunity
}
