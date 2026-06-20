import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { IssueTypeRepository } from "@/modules/service/application/ports/issue-type-repository"
import type { IssueTypePatch } from "@/modules/service/domain/issue-type"
import type { UUID } from "@/types/shared"

export type UpdateIssueTypeDeps = {
  issueTypes: IssueTypeRepository
  audit: AuditRepository
}
export type UpdateIssueTypeInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  issueTypeId: UUID
  patch: IssueTypePatch
}

/**
 * Actualiza un tipo de daño: renombrar, describir, reordenar o activar/desactivar
 * (el "archivar" del catálogo = active:false, nunca borrado físico para no romper
 * casos que ya lo referencian).
 */
export async function updateIssueType(
  { issueTypes, audit }: UpdateIssueTypeDeps,
  input: UpdateIssueTypeInput,
): Promise<void> {
  await issueTypes.update(input.tenantId, input.issueTypeId, input.patch)

  await audit.append({
    eventType: "service.issue_type.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "issue_type",
    subjectId: input.issueTypeId,
    action: "issue_type.updated",
    metadata: { fields: Object.keys(input.patch) },
    requestId: input.requestId,
    source: "web",
  })
}
