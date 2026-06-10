import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  advanceExecution,
  type AdvanceExecutionInput,
} from "@/modules/field-execution/application/use-cases/advance-execution"
import { SupabaseExecutionRepository } from "@/modules/field-execution/infrastructure/supabase-execution-repository"
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
