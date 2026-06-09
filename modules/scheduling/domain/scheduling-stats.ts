export type SchedulingStats = {
  assignmentsToday: number
  assignmentsThisWeek: number
  activeAssignments: number
  completedAssignments: number
  /** % of assignments that are completed over total (0–100), null if none. */
  utilizationRate: number | null
}
