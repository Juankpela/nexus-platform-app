import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import type { UUID } from "@/types/shared"

export type AssignOpportunityOwnerDeps = {
  opportunities: OpportunityRepository
  audit: AuditRepository
}

export type AssignOpportunityOwnerInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  ownerId: UUID | null
}

export async function assignOpportunityOwner(
  { opportunities, audit }: AssignOpportunityOwnerDeps,
  input: AssignOpportunityOwnerInput,
): Promise<void> {
  const existing = await opportunities.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError(
      "Opportunity not found.",
      "OPPORTUNITY_NOT_FOUND",
    )
  }
  if (existing.ownerId === input.ownerId) return

  await opportunities.setOwner(input.tenantId, input.id, input.ownerId)

  await audit.append({
    eventType: "crm.opportunity.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "opportunity",
    subjectId: input.id,
    action: "opportunity.updated",
    metadata: { previousOwnerId: existing.ownerId, ownerId: input.ownerId },
    requestId: input.requestId,
    source: "web",
  })
}
