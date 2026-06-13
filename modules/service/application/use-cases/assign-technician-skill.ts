import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { TechnicianSkillInput } from "@/modules/service/domain/technician-skill"
import type { UUID } from "@/types/shared"

export type AssignTechnicianSkillDeps = {
  skills: SkillRepository
  audit: AuditRepository
}
export type AssignTechnicianSkillInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  technicianId: UUID
  data: TechnicianSkillInput
}

export async function assignTechnicianSkill(
  { skills, audit }: AssignTechnicianSkillDeps,
  input: AssignTechnicianSkillInput,
): Promise<void> {
  await skills.assignTechnicianSkill(input.tenantId, input.technicianId, input.data)

  await audit.append({
    eventType: "service.technician_skill.assigned",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: input.technicianId,
    action: "technician_skill.assigned",
    metadata: { skillId: input.data.skillId, level: input.data.level },
    requestId: input.requestId,
    source: "web",
  })
}
