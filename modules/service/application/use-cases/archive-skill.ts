import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { UUID } from "@/types/shared"

export type ArchiveSkillDeps = { skills: SkillRepository; audit: AuditRepository }
export type ArchiveSkillInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  archivedAt: string
}

export async function archiveSkill(
  { skills, audit }: ArchiveSkillDeps,
  input: ArchiveSkillInput,
): Promise<void> {
  await skills.archiveSkill(input.tenantId, input.id, input.archivedAt)

  await audit.append({
    eventType: "service.skill.archived",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "skill",
    subjectId: input.id,
    action: "skill.archived",
    metadata: {},
    requestId: input.requestId,
    source: "web",
  })
}
