import type {
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/modules/service/domain/work-order"

export type WorkOrderStats = {
  openCount: number
  completedThisMonth: number
  totalCount: number
  avgResolutionHours: number | null
  byStatus: Record<WorkOrderStatus, number>
  byPriority: Record<WorkOrderPriority, number>
  technicianUtilizationPct: number | null
}

/** Per-asset service summary shown on the Asset detail page. */
export type AssetServiceSummary = {
  openCount: number
  historicalCount: number
  lastVisitAt: string | null
  nextScheduledAt: string | null
  avgDaysBetweenInterventions: number | null
}
