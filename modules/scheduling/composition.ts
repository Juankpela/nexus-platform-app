import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  assignWorkOrder,
  type AssignWorkOrderInput,
} from "@/modules/scheduling/application/use-cases/assign-work-order"
import { getSchedulingStats } from "@/modules/scheduling/application/use-cases/get-scheduling-stats"
import { listAssignments } from "@/modules/scheduling/application/use-cases/list-assignments"
import { scanOverdueWorkOrders } from "@/modules/scheduling/application/use-cases/scan-overdue-work-orders"
import {
  reassignWorkOrder,
  type ReassignWorkOrderInput,
} from "@/modules/scheduling/application/use-cases/reassign-work-order"
import {
  unassignWorkOrder,
  type UnassignWorkOrderInput,
} from "@/modules/scheduling/application/use-cases/unassign-work-order"
import { SupabaseOverdueScanRepository } from "@/modules/scheduling/infrastructure/supabase-overdue-scan-repository"
import { SupabaseSchedulingRepository } from "@/modules/scheduling/infrastructure/supabase-scheduling-repository"
import type { AssignmentFilters } from "@/modules/scheduling/domain/work-order-assignment"
import { SupabaseTechnicianRepository } from "@/modules/service/infrastructure/supabase-technician-repository"
import { SupabaseWorkOrderRepository } from "@/modules/service/infrastructure/supabase-work-order-repository"
import type { UUID } from "@/types/shared"

function schedulingRepo() {
  return new SupabaseSchedulingRepository()
}

function technicianReader() {
  return new SupabaseTechnicianRepository()
}

function workOrderReader() {
  return new SupabaseWorkOrderRepository()
}

function audit() {
  return new SupabaseAuditRepository()
}

export function listTenantAssignments(
  tenantId: UUID,
  filters: AssignmentFilters,
  page: number,
  pageSize: number,
) {
  return listAssignments(schedulingRepo(), tenantId, filters, page, pageSize)
}

export function getAssignmentRecord(tenantId: UUID, id: UUID) {
  return schedulingRepo().getById(tenantId, id)
}

export function getTenantSchedulingStats(tenantId: UUID) {
  return getSchedulingStats(schedulingRepo(), tenantId)
}

export function assignWorkOrderRecord(input: AssignWorkOrderInput) {
  return assignWorkOrder(
    {
      assignments: schedulingRepo(),
      technicians: technicianReader(),
      workOrders: workOrderReader(),
      audit: audit(),
    },
    input,
  )
}

export function reassignWorkOrderRecord(input: ReassignWorkOrderInput) {
  return reassignWorkOrder(
    {
      assignments: schedulingRepo(),
      technicians: technicianReader(),
      audit: audit(),
    },
    input,
  )
}

export function unassignWorkOrderRecord(input: UnassignWorkOrderInput) {
  return unassignWorkOrder(
    { assignments: schedulingRepo(), audit: audit() },
    input,
  )
}

/** At-risk lead time before SLA breach. Daily cron makes this best-effort (R4). */
const OVERDUE_AT_RISK_WINDOW_MS = 2 * 60 * 60 * 1000

/**
 * Periodic overdue/at-risk sweep. Runs from the cron with the SERVICE-ROLE
 * client (no user session): one admin client backs both the scan repo and the
 * audit repo so emissions actually persist under RLS. Idempotent — safe to
 * re-run; the retry is the next tick.
 */
export function runOverdueScanBatch() {
  const admin = createAdminSupabaseClient()
  return scanOverdueWorkOrders({
    repo: new SupabaseOverdueScanRepository(admin),
    audit: new SupabaseAuditRepository(() => admin),
    nowMs: Date.now(),
    requestId: crypto.randomUUID(),
    atRiskWindowMs: OVERDUE_AT_RISK_WINDOW_MS,
  })
}
