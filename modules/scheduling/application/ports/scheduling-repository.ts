import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  AssignmentFilters,
  WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import type { SchedulingStats } from "@/modules/scheduling/domain/scheduling-stats"
import type { UUID } from "@/types/shared"

export interface SchedulingRepository {
  list(
    tenantId: UUID,
    filters: AssignmentFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<WorkOrderAssignment>>
  getById(tenantId: UUID, id: UUID): Promise<WorkOrderAssignment | null>
  /**
   * Active assignments (scheduled/in_progress) for the given work orders, newest
   * first. Powers the derived "current technician" (ADR-031), replacing the
   * legacy assigned_technician_id.
   */
  findActiveByWorkOrders(
    tenantId: UUID,
    workOrderIds: UUID[],
  ): Promise<WorkOrderAssignment[]>
  /**
   * Active assignments for a technician overlapping [start, end).
   * `excludeId` skips a given assignment (used on reassign/reschedule).
   */
  findOverlapping(
    tenantId: UUID,
    technicianId: UUID,
    start: string,
    end: string,
    excludeId?: UUID | null,
  ): Promise<WorkOrderAssignment[]>
  create(
    tenantId: UUID,
    params: {
      workOrderId: UUID
      technicianId: UUID
      scheduledStart: string
      scheduledEnd: string
      estimatedDurationMinutes: number
    },
  ): Promise<WorkOrderAssignment>
  reschedule(
    tenantId: UUID,
    id: UUID,
    params: {
      technicianId: UUID
      scheduledStart: string
      scheduledEnd: string
      estimatedDurationMinutes: number
    },
  ): Promise<WorkOrderAssignment>
  delete(tenantId: UUID, id: UUID): Promise<void>
  getStats(tenantId: UUID): Promise<SchedulingStats>
}
