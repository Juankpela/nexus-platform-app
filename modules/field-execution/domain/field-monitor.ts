import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import type { UUID } from "@/types/shared"

// Read model for the admin "Field Monitor": where each technician is right now.
// This projects the Execution aggregate (ADR-020/021) into an oversight view —
// the dispatcher sees live execution sub-states that the legacy dispatch board
// does not surface.

/** The job a technician is currently executing (active or just resolved today). */
export type FieldMonitorJob = {
  assignmentId: UUID | null
  workOrderId: UUID
  workOrderNumber: string | null
  workOrderSubject: string | null
  companyName: string | null
  priority: string | null
  executionStatus: ExecutionStatus
  /** When the current status began (accepted/arrived/started/…), if known. */
  since: string | null
  /** Technician's closing comment (resolution notes / unable reason), if any. */
  notes: string | null
  updatedAt: string
}

export type FieldMonitorEntry = {
  technicianId: UUID
  technicianName: string
  technicianStatus: string
  /** Current in-progress job (accepted/on_site/working), or null if idle. */
  activeJob: FieldMonitorJob | null
  /** Executions this technician completed today (UTC). */
  completedToday: number
}

export type FieldMonitorBoard = {
  generatedAt: string
  entries: FieldMonitorEntry[]
}

/** Execution sub-states considered "in the field, in progress". */
export const ACTIVE_EXECUTION_STATUSES: ExecutionStatus[] = [
  "accepted",
  "on_site",
  "working",
]
