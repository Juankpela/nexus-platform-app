import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import type { Zone, ZoneInput } from "@/modules/service/domain/zone"
import type { UUID } from "@/types/shared"

export type CreateZoneDeps = { zones: ZoneRepository; audit: AuditRepository }
export type CreateZoneInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: ZoneInput
}

export async function createZone(
  { zones, audit }: CreateZoneDeps,
  input: CreateZoneInput,
): Promise<Zone> {
  const zone = await zones.createZone(input.tenantId, input.data)

  await audit.append({
    eventType: "service.zone.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "service_zone",
    subjectId: zone.id,
    action: "zone.created",
    metadata: { name: zone.name },
    requestId: input.requestId,
    source: "web",
  })

  return zone
}
