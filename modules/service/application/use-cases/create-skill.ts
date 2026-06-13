import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { Skill, SkillInput } from "@/modules/service/domain/skill"
import type { UUID } from "@/types/shared"

export type CreateSkillDeps = { skills: SkillRepository; audit: AuditRepository }
export type CreateSkillInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: SkillInput
}

export async function createSkill(
  { skills, audit }: CreateSkillDeps,
  input: CreateSkillInput,
): Promise<Skill> {
  const skill = await skills.createSkill(input.tenantId, input.data)

  await audit.append({
    eventType: "service.skill.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "skill",
    subjectId: skill.id,
    action: "skill.created",
    metadata: { name: skill.name },
    requestId: input.requestId,
    source: "web",
  })

  return skill
}
