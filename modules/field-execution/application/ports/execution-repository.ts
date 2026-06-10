import type {
  Execution,
  ExecutionStatus,
  WorkerAssignment,
} from "@/modules/field-execution/domain/execution"
import type { UUID } from "@/types/shared"

/** Mutable execution fields the use-cases may set on a transition. */
export type ExecutionPatch = {
  status: ExecutionStatus
  acceptedAt?: string | null
  arrivedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  unableToCompleteAt?: string | null
  resolutionNotes?: string | null
  unableReason?: string | null
}

export interface ExecutionRepository {
  /** Maps the current auth user to their technician record in this tenant. */
  resolveTechnicianByUser(
    tenantId: UUID,
    userId: UUID,
  ): Promise<{ id: UUID } | null>
  /** The technician's own assignments + their (optional) execution status. */
  listMyAssignments(
    tenantId: UUID,
    technicianId: UUID,
  ): Promise<WorkerAssignment[]>
  getMyAssignment(
    tenantId: UUID,
    technicianId: UUID,
    assignmentId: UUID,
  ): Promise<WorkerAssignment | null>
  getExecutionByAssignment(
    tenantId: UUID,
    assignmentId: UUID,
  ): Promise<Execution | null>
  createExecution(
    tenantId: UUID,
    params: {
      assignmentId: UUID
      workOrderId: UUID
      technicianId: UUID
      patch: ExecutionPatch
    },
  ): Promise<Execution>
  updateExecution(
    tenantId: UUID,
    id: UUID,
    patch: ExecutionPatch,
  ): Promise<Execution>
}
