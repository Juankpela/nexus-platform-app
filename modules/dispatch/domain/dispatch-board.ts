import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"
import type { TechnicianWorkload } from "@/modules/dispatch/domain/technician-workload"

/** A board row: a technician's workload plus that day's assignments. */
export type DispatchBoardEntry = {
  workload: TechnicianWorkload
  assignments: WorkOrderAssignment[]
}

export type DispatchBoard = {
  date: string
  entries: DispatchBoardEntry[]
}
