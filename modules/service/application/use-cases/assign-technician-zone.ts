import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import type { UUID } from "@/types/shared"

export type AssignTechnicianZoneDeps = { zones: ZoneRepository; audit: AuditRepository }
export type AssignTechnicianZoneInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  technicianId: UUID
  zoneId: UUID
}

export async function assignTechnicianZone(
  { zones, audit }: AssignTechnicianZoneDeps,
  input: AssignTechnicianZoneInput,
): Promise<void> {
  await zones.assignTechnicianZone(input.tenantId, input.technicianId, input.zoneId)

  await audit.append({
    eventType: "service.technician_zone.assigned",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: input.technicianId,
    action: "technician_zone.assigned",
    metadata: { zoneId: input.zoneId },
    requestId: input.requestId,
    source: "web",
  })
}
