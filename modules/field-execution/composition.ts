import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  advanceExecution,
  type AdvanceExecutionInput,
} from "@/modules/field-execution/application/use-cases/advance-execution"
import { SupabaseExecutionRepository } from "@/modules/field-execution/infrastructure/supabase-execution-repository"
import { projectExecutionToWorkOrder } from "@/modules/field-execution/infrastructure/supabase-execution-projection"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import type { UUID } from "@/types/shared"

function executionRepo() {
  return new SupabaseExecutionRepository()
}

function audit() {
  return new SupabaseAuditRepository()
}

export function resolveCurrentTechnician(tenantId: UUID, userId: UUID) {
  return executionRepo().resolveTechnicianByUser(tenantId, userId)
}

export function listMyAssignments(tenantId: UUID, technicianId: UUID) {
  return executionRepo().listMyAssignments(tenantId, technicianId)
}

export function getMyAssignment(
  tenantId: UUID,
  technicianId: UUID,
  assignmentId: UUID,
) {
  return executionRepo().getMyAssignment(tenantId, technicianId, assignmentId)
}

export function advanceExecutionRecord(input: AdvanceExecutionInput) {
  return advanceExecution(
    { executions: executionRepo(), audit: audit() },
    input,
  )
}

export function getFieldMonitorBoard(tenantId: UUID) {
  return executionRepo().getFieldMonitor(tenantId)
}

export function getTechnicianFieldDetail(tenantId: UUID, technicianId: UUID) {
  const repo = executionRepo()
  return Promise.all([
    repo.getTechnicianInfo(tenantId, technicianId),
    repo.getTechnicianAssignments(tenantId, technicianId),
  ]).then(([technician, assignments]) => ({ technician, assignments }))
}

export function projectExecution(input: {
  tenantId: UUID
  workOrderId: UUID
  assignmentId: UUID
  target: Exclude<ExecutionStatus, "pending">
  technicianUserId: UUID
}) {
  return projectExecutionToWorkOrder({ ...input, now: new Date().toISOString() })
}
