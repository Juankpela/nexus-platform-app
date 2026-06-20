import type { Skill, SkillInput } from "@/modules/service/domain/skill"
import type {
  TechnicianSkill,
  TechnicianSkillInput,
} from "@/modules/service/domain/technician-skill"
import type { UUID } from "@/types/shared"

export interface SkillRepository {
  /** Active (non-archived) skill catalog for the tenant, ordered by name. */
  listSkills(tenantId: UUID): Promise<Skill[]>
  createSkill(tenantId: UUID, input: SkillInput): Promise<Skill>
  /** Reemplaza el vocabulario (aliases) propio del tenant para una skill (Hito B). */
  setSkillAliases(tenantId: UUID, id: UUID, aliases: string[]): Promise<void>
  /** Reemplaza el catálogo de tipos de daño (Paso 2 del reporte) de una skill. */
  setSkillIncidentTypes(tenantId: UUID, id: UUID, incidentTypes: string[]): Promise<void>
  /** Soft-archive: hides from the catalog without breaking technician_skills refs. */
  archiveSkill(tenantId: UUID, id: UUID, archivedAt: string): Promise<void>

  listTechnicianSkills(tenantId: UUID, technicianId: UUID): Promise<TechnicianSkill[]>
  /** Upsert the (technician, skill) level. */
  assignTechnicianSkill(
    tenantId: UUID,
    technicianId: UUID,
    input: TechnicianSkillInput,
  ): Promise<void>
  removeTechnicianSkill(
    tenantId: UUID,
    technicianId: UUID,
    skillId: UUID,
  ): Promise<void>
}
