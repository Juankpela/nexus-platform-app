// Domain event names (ubiquitous language, ADR-020). FWX-1 does NOT implement an
// event bus — these are the emission points. Today each is recorded in the audit
// trail; when the Event Bus lands, these become its topics unchanged.

export const FIELD_EXECUTION_EVENTS = {
  accepted: "execution.assignment_accepted",
  arrived: "execution.technician_arrived",
  started: "execution.work_started",
  completed: "execution.work_completed",
  failed: "execution.execution_failed",
} as const

export type FieldExecutionEvent =
  (typeof FIELD_EXECUTION_EVENTS)[keyof typeof FIELD_EXECUTION_EVENTS]
