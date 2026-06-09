import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import type { Case, CaseInput } from "@/modules/service/domain/case"
import { computeSlaDueAt } from "@/modules/service/domain/sla"
import type { UUID } from "@/types/shared"

export type CreateCaseDeps = {
  cases: CaseRepository
  audit: AuditRepository
}

export type CreateCaseInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  ownerId: UUID | null
  data: CaseInput
}

export async function createCase(
  { cases, audit }: CreateCaseDeps,
  input: CreateCaseInput,
): Promise<Case> {
  // Default the owner to the creating user when none is provided.
  const ownerId = input.ownerId ?? input.actorId
  const caseNumber = await cases.nextCaseNumber(input.tenantId)
  const slaDueAt = computeSlaDueAt(
    new Date().toISOString(),
    input.data.priority,
  )

  const record = await cases.create(input.tenantId, {
    ownerId,
    createdBy: input.actorId,
    caseNumber,
    slaDueAt,
    input: input.data,
  })

  await audit.append({
    eventType: "service.case.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "case",
    subjectId: record.id,
    action: "case.created",
    metadata: {
      caseNumber: record.caseNumber,
      subject: record.subject,
      priority: record.priority,
      origin: record.origin,
      companyId: record.companyId,
      contactId: record.contactId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
