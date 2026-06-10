import type { UUID } from "@/types/shared"

export type ExecutionStatus =
  | "pending"
  | "accepted"
  | "on_site"
  | "working"
  | "completed"
  | "unable_to_complete"

export const EXECUTION_STATUSES: ExecutionStatus[] = [
  "pending",
  "accepted",
  "on_site",
  "working",
  "completed",
  "unable_to_complete",
]

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  on_site: "En sitio",
  working: "En ejecución",
  completed: "Completada",
  unable_to_complete: "No completada",
}

/**
 * Execution lifecycle (ADR-020). `completed` and `unable_to_complete` are
 * terminal. `unable_to_complete` is reachable from any active state.
 */
export const EXECUTION_STATUS_TRANSITIONS: Record<
  ExecutionStatus,
  ExecutionStatus[]
> = {
  pending: ["accepted", "unable_to_complete"],
  accepted: ["on_site", "unable_to_complete"],
  on_site: ["working", "unable_to_complete"],
  working: ["completed", "unable_to_complete"],
  completed: [],
  unable_to_complete: [],
}

export function canTransition(
  from: ExecutionStatus,
  to: ExecutionStatus,
): boolean {
  return EXECUTION_STATUS_TRANSITIONS[from].includes(to)
}

export type Execution = {
  id: UUID
  assignmentId: UUID
  workOrderId: UUID
  technicianId: UUID
  status: ExecutionStatus
  acceptedAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  completedAt: string | null
  unableToCompleteAt: string | null
  resolutionNotes: string | null
  unableReason: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Read view the worker sees: their assignment + the (optional) execution status.
 * If no execution exists yet, the effective status is `pending`.
 */
export type WorkerAssignment = {
  assignmentId: UUID
  scheduledStart: string
  scheduledEnd: string
  workOrderId: UUID
  workOrderNumber: string | null
  workOrderSubject: string | null
  companyName: string | null
  assetName: string | null
  executionId: UUID | null
  executionStatus: ExecutionStatus
}

/** The effective execution status for a possibly-missing execution row. */
export function effectiveStatus(status: ExecutionStatus | null): ExecutionStatus {
  return status ?? "pending"
}
