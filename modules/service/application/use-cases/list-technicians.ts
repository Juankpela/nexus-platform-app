import type { TechnicianRepository } from "@/modules/service/application/ports/technician-repository"
import type {
  TechnicianFilters,
  TechnicianSort,
} from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

export function listTechnicians(
  technicians: TechnicianRepository,
  tenantId: UUID,
  filters: TechnicianFilters,
  sort: TechnicianSort,
  page: number,
  pageSize: number,
) {
  return technicians.list(tenantId, filters, sort, page, pageSize)
}
