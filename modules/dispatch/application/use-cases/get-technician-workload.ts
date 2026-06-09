import {
  buildTechnicianWorkload,
  type TechnicianWorkload,
} from "@/modules/dispatch/domain/technician-workload"
import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

export type GetTechnicianWorkloadInput = {
  technicianId: UUID
  technicianName: string
  technicianStatus: TechnicianStatus
  assignmentCount: number
  scheduledMinutes: number
}

/** Calculates scheduled/available minutes, utilization and status. */
export function getTechnicianWorkload(
  input: GetTechnicianWorkloadInput,
): TechnicianWorkload {
  return buildTechnicianWorkload(input)
}
