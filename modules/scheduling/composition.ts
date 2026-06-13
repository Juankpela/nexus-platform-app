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
import { projectSlaAlertBoard } from "@/modules/scheduling/domain/sla-alert-board"
import type { EligibilityRequirement } from "@/modules/scheduling/domain/eligibility"
import { SupabaseEligibilityResolver } from "@/modules/scheduling/infrastructure/supabase-eligibility-resolver"
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

/** Single timezone config point (ADR-028). tenant.timezone column deferred. */
const TENANT_TIMEZONE = "America/Bogota"

/**
 * Read-only technician eligibility (PR4, ADR-028). Returns candidates evaluated
 * against deterministic hard filters, ordered by lighter day-load. Suggestion
 * only — writes nothing; manual assignment is unchanged.
 */
export function findEligibleTechnicians(tenantId: UUID, requirement: EligibilityRequirement) {
  return new SupabaseEligibilityResolver(TENANT_TIMEZONE).findEligible(tenantId, requirement)
}

/**
 * Live SLA-alert projection for the dispatch card. Reads open WOs with an SLA
 * through the user (RLS) client and classifies them in-request — stateless,
 * derived, NOT backed by the scanner cursor or audit. Same SLA-only scope as
 * the scanner so the durable signal and the visual view stay consistent.
 */
export async function getTenantSlaAlerts(tenantId: UUID) {
  const rows = await workOrderReader().listOpenWithSla(tenantId)
  return projectSlaAlertBoard(rows, {
    nowMs: Date.now(),
    atRiskWindowMs: OVERDUE_AT_RISK_WINDOW_MS,
  })
}

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
