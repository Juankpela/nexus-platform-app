import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import type { UUID } from "@/types/shared"

export type AssignCaseOwnerDeps = {
  cases: CaseRepository
  audit: AuditRepository
}

export type AssignCaseOwnerInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  ownerId: UUID | null
}

export async function assignCaseOwner(
  { cases, audit }: AssignCaseOwnerDeps,
  input: AssignCaseOwnerInput,
): Promise<void> {
  const existing = await cases.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Case not found.", "CASE_NOT_FOUND")
  }
  if (existing.ownerId === input.ownerId) return

  await cases.setOwner(input.tenantId, input.id, input.ownerId)

  await audit.append({
    eventType: "service.case.assigned",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "case",
    subjectId: input.id,
    action: "case.assigned",
    metadata: { from: existing.ownerId, to: input.ownerId },
    requestId: input.requestId,
    source: "web",
  })
}
