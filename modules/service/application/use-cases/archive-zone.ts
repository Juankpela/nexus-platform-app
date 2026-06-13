import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ZoneRepository } from "@/modules/service/application/ports/zone-repository"
import type { UUID } from "@/types/shared"

export type ArchiveZoneDeps = { zones: ZoneRepository; audit: AuditRepository }
export type ArchiveZoneInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  archivedAt: string
}

export async function archiveZone(
  { zones, audit }: ArchiveZoneDeps,
  input: ArchiveZoneInput,
): Promise<void> {
  await zones.archiveZone(input.tenantId, input.id, input.archivedAt)

  await audit.append({
    eventType: "service.zone.archived",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "service_zone",
    subjectId: input.id,
    action: "zone.archived",
    metadata: {},
    requestId: input.requestId,
    source: "web",
  })
}
