import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { IssueTypeRepository } from "@/modules/service/application/ports/issue-type-repository"
import type { IssueType } from "@/modules/service/domain/issue-type"
import type { UUID } from "@/types/shared"

export type CreateIssueTypeDeps = {
  issueTypes: IssueTypeRepository
  audit: AuditRepository
}
export type CreateIssueTypeInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  skillId: UUID
  name: string
  description?: string | null
  displayOrder?: number
}

/** Crea un tipo de daño en el catálogo operacional del tenant (Pilar 1). */
export async function createIssueType(
  { issueTypes, audit }: CreateIssueTypeDeps,
  input: CreateIssueTypeInput,
): Promise<IssueType> {
  const created = await issueTypes.create(input.tenantId, {
    skillId: input.skillId,
    name: input.name,
    description: input.description ?? null,
    displayOrder: input.displayOrder,
  })

  await audit.append({
    eventType: "service.issue_type.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "issue_type",
    subjectId: created.id,
    action: "issue_type.created",
    metadata: { skillId: input.skillId, name: created.name },
    requestId: input.requestId,
    source: "web",
  })

  return created
}
