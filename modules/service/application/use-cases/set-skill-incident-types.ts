import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { SkillRepository } from "@/modules/service/application/ports/skill-repository"
import type { UUID } from "@/types/shared"

export type SetSkillIncidentTypesDeps = {
  skills: SkillRepository
  audit: AuditRepository
}
export type SetSkillIncidentTypesInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  skillId: UUID
  incidentTypes: string[]
}

/**
 * Reemplaza el catálogo de tipos de daño (Paso 2 del reporte guiado) de una skill.
 * Vocabulario controlado que el reporte público ofrece y que el caso guarda como
 * `incident_type` estructurado (no texto libre).
 */
export async function setSkillIncidentTypes(
  { skills, audit }: SetSkillIncidentTypesDeps,
  input: SetSkillIncidentTypesInput,
): Promise<void> {
  await skills.setSkillIncidentTypes(input.tenantId, input.skillId, input.incidentTypes)

  await audit.append({
    eventType: "service.skill.incident_types_updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "skill",
    subjectId: input.skillId,
    action: "skill.incident_types_updated",
    metadata: { count: input.incidentTypes.length },
    requestId: input.requestId,
    source: "web",
  })
}
