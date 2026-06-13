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
  quoteId: UUID | null
  quoteNumber: string | null
  assetId: UUID | null
  assetName: string | null
  assignedTechnicianId: UUID | null
  subject: string
  description: string | null
  priority: WorkOrderPriority
  status: WorkOrderStatus
  scheduledStart: string | null
  scheduledEnd: string | null
  /** SLA deadline — when the work must be finished by (distinct from the planned window). */
  slaDueAt: string | null
  actualStart: string | null
  actualEnd: string | null
  laborHours: number | null
  resolutionSummary: string | null
  completionNotes: string | null
  /** E2 — commercial attribute: does completing this WO grant a right to bill? */
  billable: boolean
  /** E2-H3 — set when a billing role approves the WO for invoicing. */
  billingApprovedAt: string | null
  billingApprovedBy: UUID | null
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

/**
 * E2 — a Work Order may be invoiced only when it is billable, approved for billing,
 * and completed. Used by the billing flow (E1 generate-from-WO) and the UI gate.
 */
export function isWorkOrderInvoiceable(wo: {
  billable: boolean
  billingApprovedAt: string | null
  status: WorkOrderStatus
}): boolean {
  return wo.billable && wo.billingApprovedAt !== null && wo.status === "completed"
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
  slaDueAt: string | null
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
