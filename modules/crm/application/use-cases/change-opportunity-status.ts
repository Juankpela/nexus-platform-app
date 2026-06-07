import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import {
  OPPORTUNITY_STATUS_TRANSITIONS,
  type OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import type { UUID } from "@/types/shared"

export type ChangeOpportunityStatusDeps = {
  opportunities: OpportunityRepository
  audit: AuditRepository
}

export type ChangeOpportunityStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: OpportunityStatus
}

export async function changeOpportunityStatus(
  { opportunities, audit }: ChangeOpportunityStatusDeps,
  input: ChangeOpportunityStatusInput,
): Promise<void> {
  const existing = await opportunities.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError(
      "Opportunity not found.",
      "OPPORTUNITY_NOT_FOUND",
    )
  }
  if (existing.status === input.status) return

  const allowed = OPPORTUNITY_STATUS_TRANSITIONS[existing.status]
  if (!allowed.includes(input.status)) {
    throw new ApplicationError(
      `Cannot move a ${existing.status} opportunity to ${input.status}.`,
      "INVALID_STATUS_TRANSITION",
    )
  }

  await opportunities.setStatus(input.tenantId, input.id, input.status)

  const base: Omit<AuditEvent, "eventType" | "action"> = {
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "opportunity",
    subjectId: input.id,
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  }

  await audit.append({
    ...base,
    eventType: "crm.opportunity.status_changed",
    action: "opportunity.status_changed",
  })

  if (input.status === "won") {
    await audit.append({
      ...base,
      eventType: "crm.opportunity.won",
      action: "opportunity.won",
    })
  } else if (input.status === "lost") {
    await audit.append({
      ...base,
      eventType: "crm.opportunity.lost",
      action: "opportunity.lost",
    })
  }
}
