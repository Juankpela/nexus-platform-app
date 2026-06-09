import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import type { Case, CaseInput } from "@/modules/service/domain/case"
import type { UUID } from "@/types/shared"

export type UpdateCaseDeps = {
  cases: CaseRepository
  audit: AuditRepository
}

export type UpdateCaseInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: CaseInput
}

export async function updateCase(
  { cases, audit }: UpdateCaseDeps,
  input: UpdateCaseInput,
): Promise<Case> {
  const existing = await cases.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Case not found.", "CASE_NOT_FOUND")
  }

  const record = await cases.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "service.case.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "case",
    subjectId: record.id,
    action: "case.updated",
    metadata: {
      caseNumber: record.caseNumber,
      subject: record.subject,
      priority: record.priority,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
