import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import type { UUID } from "@/types/shared"

export type RemoveTechnicianZoneDeps = { zones: ZoneRepository; audit: AuditRepository }
export type RemoveTechnicianZoneInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  technicianId: UUID
  zoneId: UUID
}

export async function removeTechnicianZone(
  { zones, audit }: RemoveTechnicianZoneDeps,
  input: RemoveTechnicianZoneInput,
): Promise<void> {
  await zones.removeTechnicianZone(input.tenantId, input.technicianId, input.zoneId)

  await audit.append({
    eventType: "service.technician_zone.removed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "technician",
    subjectId: input.technicianId,
    action: "technician_zone.removed",
    metadata: { zoneId: input.zoneId },
    requestId: input.requestId,
    source: "web",
  })
}
