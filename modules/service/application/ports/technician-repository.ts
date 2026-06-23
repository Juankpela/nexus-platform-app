import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  Technician,
  TechnicianFilters,
  TechnicianInput,
  TechnicianSort,
} from "@/modules/service/domain/technician"
import type { TechnicianStats } from "@/modules/service/domain/technician-stats"
import type { UUID } from "@/types/shared"

export interface TechnicianRepository {
  list(
    tenantId: UUID,
    filters: TechnicianFilters,
    sort: TechnicianSort,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Technician>>
  getById(tenantId: UUID, id: UUID): Promise<Technician | null>
  /** Returns an active (non-deleted) technician matching email (case-insensitive), if any. */
  findByEmail(tenantId: UUID, email: string): Promise<Technician | null>
  /** Returns an active (non-deleted) technician matching employee_id, if any. */
  findByEmployeeId(tenantId: UUID, employeeId: string): Promise<Technician | null>
  /** Returns the active (non-deleted) technician linked to a user account, if any. */
  findByUserId(tenantId: UUID, userId: UUID): Promise<Technician | null>
  create(tenantId: UUID, input: TechnicianInput): Promise<Technician>
  update(tenantId: UUID, id: UUID, input: TechnicianInput): Promise<Technician>
  softDelete(tenantId: UUID, id: UUID, deletedAt: string): Promise<void>
  getStats(tenantId: UUID): Promise<TechnicianStats>
}
