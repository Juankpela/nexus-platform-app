import type { Zone, ZoneInput } from "@/modules/service/domain/zone"
import type { TechnicianZone } from "@/modules/service/domain/technician-zone"
import type { UUID } from "@/types/shared"

export interface ZoneRepository {
  listZones(tenantId: UUID): Promise<Zone[]>
  createZone(tenantId: UUID, input: ZoneInput): Promise<Zone>
  archiveZone(tenantId: UUID, id: UUID, archivedAt: string): Promise<void>

  listTechnicianZones(tenantId: UUID, technicianId: UUID): Promise<TechnicianZone[]>
  assignTechnicianZone(tenantId: UUID, technicianId: UUID, zoneId: UUID): Promise<void>
  removeTechnicianZone(tenantId: UUID, technicianId: UUID, zoneId: UUID): Promise<void>
}
