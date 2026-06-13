import type { SkillLevel } from "@/modules/service/domain/skill"
import type { UUID } from "@/types/shared"

/** A skill held by a technician, at a level. */
export type TechnicianSkill = {
  skillId: UUID
  skillName: string
  level: SkillLevel
  createdAt: string
  updatedAt: string
}

export type TechnicianSkillInput = {
  skillId: UUID
  level: SkillLevel
}
