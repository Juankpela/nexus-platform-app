import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"
import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

/** Aggregated, per-technician workload row (computed in SQL). */
export type RawTechnicianWorkload = {
  technicianId: UUID
  technicianName: string
  technicianStatus: TechnicianStatus
  assignmentCount: number
  scheduledMinutes: number
}

export interface DispatchRepository {
  /** SUM/COUNT/GROUP BY per active technician for the day window (SQL RPC). */
  getWorkloads(
    tenantId: UUID,
    fromIso: string,
    toIso: string,
  ): Promise<RawTechnicianWorkload[]>
  /** Time-blocking assignments starting within the day window, with refs. */
  listDayAssignments(
    tenantId: UUID,
    fromIso: string,
    toIso: string,
  ): Promise<WorkOrderAssignment[]>
}
