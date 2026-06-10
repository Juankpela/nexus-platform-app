import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type {
  ExecutionPatch,
  ExecutionRepository,
} from "@/modules/field-execution/application/ports/execution-repository"
import {
  canTransition,
  type Execution,
  type ExecutionStatus,
} from "@/modules/field-execution/domain/execution"
import {
  FIELD_EXECUTION_EVENTS,
  type FieldExecutionEvent,
} from "@/modules/field-execution/domain/execution-events"
import type { UUID } from "@/types/shared"

export type AdvanceExecutionDeps = {
  executions: ExecutionRepository
  audit: AuditRepository
}

export type AdvanceExecutionInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  technicianId: UUID
  assignmentId: UUID
  workOrderId: UUID
  target: Exclude<ExecutionStatus, "pending">
  resolutionNotes?: string | null
  unableReason?: string | null
}

const EVENT_BY_TARGET: Record<
  Exclude<ExecutionStatus, "pending">,
  FieldExecutionEvent
> = {
  accepted: FIELD_EXECUTION_EVENTS.accepted,
  on_site: FIELD_EXECUTION_EVENTS.arrived,
  working: FIELD_EXECUTION_EVENTS.started,
  completed: FIELD_EXECUTION_EVENTS.completed,
  unable_to_complete: FIELD_EXECUTION_EVENTS.failed,
}

function timestampsFor(
  target: Exclude<ExecutionStatus, "pending">,
  now: string,
): Partial<ExecutionPatch> {
  switch (target) {
    case "accepted":
      return { acceptedAt: now }
    case "on_site":
      return { arrivedAt: now }
    case "working":
      return { startedAt: now }
    case "completed":
      return { completedAt: now }
    default:
      return {}
  }
}

/**
 * Single guarded transition of the Execution aggregate (ADR-020).
 * - `accepted` with no execution yet creates it (implicit pending → accepted).
 * - Any other target requires an existing execution and a valid transition.
 * Emits the corresponding domain event (recorded in the audit trail).
 */
export async function advanceExecution(
  { executions, audit }: AdvanceExecutionDeps,
  input: AdvanceExecutionInput,
): Promise<Execution> {
  const now = new Date().toISOString()
  const existing = await executions.getExecutionByAssignment(
    input.tenantId,
    input.assignmentId,
  )

  let record: Execution
  let from: ExecutionStatus

  if (!existing) {
    // Only "accept" may bootstrap an execution; everything else needs one.
    if (input.target !== "accepted") {
      throw new ApplicationError(
        "Execution has not been accepted yet.",
        "EXECUTION_NOT_STARTED",
      )
    }
    from = "pending"
    record = await executions.createExecution(input.tenantId, {
      assignmentId: input.assignmentId,
      workOrderId: input.workOrderId,
      technicianId: input.technicianId,
      patch: { status: "accepted", ...timestampsFor("accepted", now) },
    })
  } else {
    from = existing.status
    if (!canTransition(from, input.target)) {
      throw new ApplicationError(
        `Cannot move execution from ${from} to ${input.target}.`,
        "INVALID_EXECUTION_TRANSITION",
      )
    }
    record = await executions.updateExecution(input.tenantId, existing.id, {
      status: input.target,
      ...timestampsFor(input.target, now),
      ...(input.resolutionNotes !== undefined
        ? { resolutionNotes: input.resolutionNotes }
        : {}),
      ...(input.unableReason !== undefined
        ? { unableReason: input.unableReason }
        : {}),
    })
  }

  // Domain event emission point (ADR-020) — recorded in the audit trail.
  await audit.append({
    eventType: EVENT_BY_TARGET[input.target],
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "work_order_execution",
    subjectId: record.id,
    action: EVENT_BY_TARGET[input.target],
    metadata: {
      assignmentId: input.assignmentId,
      workOrderId: input.workOrderId,
      from,
      to: input.target,
    },
    requestId: input.requestId,
    source: "field",
  })

  return record
}
