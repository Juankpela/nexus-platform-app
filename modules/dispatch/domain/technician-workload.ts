import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

/** Regla 1 — capacidad diaria estándar: 8 horas. */
export const DAILY_CAPACITY_MINUTES = 480

export type WorkloadStatus = "available" | "busy" | "overloaded" | "unavailable"

export const WORKLOAD_STATUS_LABELS: Record<WorkloadStatus, string> = {
  available: "Disponible",
  busy: "Ocupado",
  overloaded: "Sobrecargado",
  unavailable: "No disponible",
}

/** Order for the board: overloaded → busy → available → unavailable. */
export const WORKLOAD_STATUS_ORDER: Record<WorkloadStatus, number> = {
  overloaded: 0,
  busy: 1,
  available: 2,
  unavailable: 3,
}

export type TechnicianWorkload = {
  technicianId: UUID
  technicianName: string
  assignmentCount: number
  scheduledMinutes: number
  availableMinutes: number
  utilizationPercent: number
  status: WorkloadStatus
}

/**
 * Pure workload classification (Reglas 1–5):
 *  - Regla 5: technician.status != active → unavailable
 *  - Regla 2: utilization < 70%  → available
 *  - Regla 3: 70% ≤ utilization ≤ 100% → busy
 *  - Regla 4: utilization > 100% → overloaded
 */
export function buildTechnicianWorkload(input: {
  technicianId: UUID
  technicianName: string
  technicianStatus: TechnicianStatus
  assignmentCount: number
  scheduledMinutes: number
  capacityMinutes?: number
}): TechnicianWorkload {
  const capacity = input.capacityMinutes ?? DAILY_CAPACITY_MINUTES
  const utilizationPercent =
    capacity > 0 ? Math.round((input.scheduledMinutes / capacity) * 100) : 0
  const availableMinutes = Math.max(0, capacity - input.scheduledMinutes)

  let status: WorkloadStatus
  if (input.technicianStatus !== "active") {
    status = "unavailable"
  } else if (utilizationPercent > 100) {
    status = "overloaded"
  } else if (utilizationPercent >= 70) {
    status = "busy"
  } else {
    status = "available"
  }

  return {
    technicianId: input.technicianId,
    technicianName: input.technicianName,
    assignmentCount: input.assignmentCount,
    scheduledMinutes: input.scheduledMinutes,
    availableMinutes,
    utilizationPercent,
    status,
  }
}
