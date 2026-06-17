import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { UUID } from "@/types/shared"

export type SetSkillAliasesDeps = { skills: SkillRepository; audit: AuditRepository }
export type SetSkillAliasesInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  skillId: UUID
  aliases: string[]
}

/** Reemplaza el vocabulario propio del tenant para una skill (Hito B). */
export async function setSkillAliases(
  { skills, audit }: SetSkillAliasesDeps,
  input: SetSkillAliasesInput,
): Promise<void> {
  await skills.setSkillAliases(input.tenantId, input.skillId, input.aliases)

  await audit.append({
    eventType: "service.skill.aliases_updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "skill",
    subjectId: input.skillId,
    action: "skill.aliases_updated",
    metadata: { count: input.aliases.length },
    requestId: input.requestId,
    source: "web",
  })
}
