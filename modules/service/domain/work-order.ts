import type { UUID } from "@/types/shared"

export type WorkOrderStatus =
  | "new"
  | "scheduled"
  | "dispatched"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled"

export type WorkOrderPriority = "low" | "medium" | "high" | "critical"

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "new",
  "scheduled",
  "dispatched",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  new: "Nueva",
  scheduled: "Programada",
  dispatched: "Despachada",
  in_progress: "En ejecución",
  on_hold: "En espera",
  completed: "Completada",
  cancelled: "Cancelada",
}

export const WORK_ORDER_PRIORITIES: WorkOrderPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
]

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
}

/**
 * Valid next statuses. `completed` and `cancelled` are terminal.
 * `on_hold` can resume to any active stage. Mirrors the case/opportunity
 * state-machine pattern.
 */
export const WORK_ORDER_STATUS_TRANSITIONS: Record<
  WorkOrderStatus,
  WorkOrderStatus[]
> = {
  new: ["scheduled", "dispatched", "cancelled"],
  scheduled: ["dispatched", "in_progress", "on_hold", "cancelled"],
  dispatched: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["scheduled", "dispatched", "in_progress", "cancelled"],
  completed: [],
  cancelled: [],
}

export type WorkOrder = {
  id: UUID
  workOrderNumber: string
  companyId: UUID | null
  companyName: string | null
  caseId: UUID | null
  caseNumber: string | null
  assetId: UUID | null
  assetName: string | null
  assignedTechnicianId: UUID | null
  subject: string
  description: string | null
  priority: WorkOrderPriority
  status: WorkOrderStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  laborHours: number | null
  resolutionSummary: string | null
  completionNotes: string | null
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

/** Fields a user may set when creating/editing a work order (status/technician managed separately). */
export type WorkOrderInput = {
  subject: string
  description: string | null
  priority: WorkOrderPriority
  companyId: UUID | null
  caseId: UUID | null
  assetId: UUID | null
  scheduledStart: string | null
  scheduledEnd: string | null
  laborHours: number | null
  resolutionSummary: string | null
  completionNotes: string | null
}

export type WorkOrderFilters = {
  search: string | null
  status: WorkOrderStatus | null
  priority: WorkOrderPriority | null
  technicianId: UUID | null
  companyId: UUID | null
  assetId: UUID | null
  /** Inclusive scheduled_start range (ISO date strings). */
  dateFrom: string | null
  dateTo: string | null
}
