import type { TechnicianWorkload } from "@/modules/dispatch/domain/technician-workload"

export type DispatchStats = {
  assignmentsToday: number
  activeTechnicians: number
  availableTechnicians: number
  busyTechnicians: number
  overloadedTechnicians: number
  averageUtilization: number | null
}

/**
 * Pure aggregation of dispatch stats from per-technician workloads.
 * `activeTechnicians` counts technicians whose status is not 'unavailable'
 * (i.e. active workforce available to the board).
 */
export function computeDispatchStats(
  workloads: TechnicianWorkload[],
  assignmentsToday: number,
): DispatchStats {
  const active = workloads.filter((w) => w.status !== "unavailable")
  const available = workloads.filter((w) => w.status === "available").length
  const busy = workloads.filter((w) => w.status === "busy").length
  const overloaded = workloads.filter((w) => w.status === "overloaded").length

  const averageUtilization =
    active.length > 0
      ? Math.round(
          active.reduce((acc, w) => acc + w.utilizationPercent, 0) / active.length,
        )
      : null

  return {
    assignmentsToday,
    activeTechnicians: active.length,
    availableTechnicians: available,
    busyTechnicians: busy,
    overloadedTechnicians: overloaded,
    averageUtilization,
  }
}
