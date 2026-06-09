import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import type { UUID } from "@/types/shared"

export function getTechnicianStats(
  technicians: TechnicianRepository,
  tenantId: UUID,
) {
  return technicians.getStats(tenantId)
}
