import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { UUID } from "@/types/shared"

export type RemoveTechnicianSkillDeps = {
  skills: SkillRepository
  audit: AuditRepository
}
export type RemoveTechnicianSkillInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  technicianId: UUID
  skillId: UUID
}

export async function removeTechnicianSkill(
  { skills, audit }: RemoveTechnicianSkillDeps,
  input: RemoveTechnicianSkillInput,
): Promise<void> {
  await skills.removeTechnicianSkill(input.tenantId, input.technicianId, input.skillId)

  await audit.append({
    eventType: "service.technician_skill.removed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: input.technicianId,
    action: "technician_skill.removed",
    metadata: { skillId: input.skillId },
    requestId: input.requestId,
    source: "web",
  })
}
