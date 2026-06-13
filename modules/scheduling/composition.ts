import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { notifyAudience } from "@/modules/notifications/application/use-cases/notify-audience"
import { SupabaseNotificationRepository } from "@/modules/notifications/infrastructure/supabase-notification-repository"
import { SupabaseRecipientResolver } from "@/modules/notifications/infrastructure/supabase-recipient-resolver"
import {
  assignWorkOrder,
  type AssignWorkOrderInput,
} from "@/modules/scheduling/application/use-cases/assign-work-order"
import { getSchedulingStats } from "@/modules/scheduling/application/use-cases/get-scheduling-stats"
import { listAssignments } from "@/modules/scheduling/application/use-cases/list-assignments"
import { scanOverdueWorkOrders } from "@/modules/scheduling/application/use-cases/scan-overdue-work-orders"
import { projectSlaAlertBoard } from "@/modules/scheduling/domain/sla-alert-board"
import type { EligibilityRequirement } from "@/modules/scheduling/domain/eligibility"
import {
  proposeReschedulesForTenant,
  RESCHEDULE_PROPOSED_EVENT,
} from "@/modules/scheduling/application/use-cases/propose-reschedules"
import type {
  ProposalOutcome,
  RescheduleProposalView,
} from "@/modules/scheduling/domain/reschedule-proposal"
import { SupabaseEligibilityResolver } from "@/modules/scheduling/infrastructure/supabase-eligibility-resolver"
import { SupabaseRescheduleCandidateReader } from "@/modules/scheduling/infrastructure/supabase-reschedule-candidate-reader"
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
import type {
  AssignmentFilters,
  WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
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

/**
 * Derived "current technician" per work order (ADR-031): map of workOrderId →
 * active assignment (most recent). Replaces the legacy assigned_technician_id as
 * the UI source.
 */
export async function getActiveAssignmentsByWorkOrder(
  tenantId: UUID,
  workOrderIds: UUID[],
): Promise<Map<UUID, WorkOrderAssignment>> {
  const rows = await schedulingRepo().findActiveByWorkOrders(tenantId, workOrderIds)
  const map = new Map<UUID, WorkOrderAssignment>()
  for (const a of rows) if (!map.has(a.workOrderId)) map.set(a.workOrderId, a)
  return map
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
  const notifyDeps = {
    notifications: new SupabaseNotificationRepository(() => admin),
    recipients: new SupabaseRecipientResolver(admin),
  }
  return scanOverdueWorkOrders({
    repo: new SupabaseOverdueScanRepository(admin),
    audit: new SupabaseAuditRepository(() => admin),
    nowMs: Date.now(),
    requestId: crypto.randomUUID(),
    atRiskWindowMs: OVERDUE_AT_RISK_WINDOW_MS,
    // PR6.2: notify the scheduling audience once per real SLA transition.
    onAlert: async ({ tenantId, workOrderId, severity }) => {
      await notifyAudience(notifyDeps, {
        tenantId,
        permissionKey: SERVICE_PERMISSIONS.schedulingRead,
        type: "sla_alert",
        title:
          severity === "critical"
            ? "Orden de trabajo vencida (SLA)"
            : "Orden en riesgo de SLA",
        link: `work-orders/${workOrderId}`,
      })
    },
  })
}

/** How far ahead the reschedule engine searches for the next free slot. */
const RESCHEDULE_HORIZON_DAYS = 14

/**
 * Dry-run auto-reschedule proposals (PR5b, ADR-029). Per-tenant sweep from the
 * scanning cron, service role. Emits `scheduling.reschedule_proposed` audit
 * events — WRITES NOTHING to assignments. Authorized only by disposition.
 */
export async function runRescheduleProposalsBatch() {
  const admin = createAdminSupabaseClient()
  const tenantIds = await new SupabaseOverdueScanRepository(admin).listActiveTenantIds()
  const deps = {
    reader: new SupabaseRescheduleCandidateReader(admin, TENANT_TIMEZONE),
    audit: new SupabaseAuditRepository(() => admin),
    nowMs: Date.now(),
    requestId: crypto.randomUUID(),
    timeZone: TENANT_TIMEZONE,
    horizonDays: RESCHEDULE_HORIZON_DAYS,
  }
  const batch = { tenants: 0, evaluated: 0, proposed: 0, needsHuman: 0, noSlot: 0, errors: 0 }
  for (const tenantId of tenantIds) {
    try {
      const r = await proposeReschedulesForTenant(deps, tenantId)
      batch.tenants += 1
      batch.evaluated += r.evaluated
      batch.proposed += r.rescheduleProposals
      batch.needsHuman += r.needsHuman
      batch.noSlot += r.noSlot
      batch.errors += r.errors
    } catch {
      batch.errors += 1
    }
  }
  return batch
}

/**
 * Read-only feed of the latest dry-run reschedule proposal per work order, read
 * back from the audit trail (RLS: requires tenant.audit.read). Dedups by WO
 * keeping the newest. Powers the dispatch "Propuestas de reagendamiento" panel.
 */
export async function listRecentRescheduleProposals(
  tenantId: UUID,
): Promise<RescheduleProposalView[]> {
  const entries = await new SupabaseAuditRepository().listRecentByEventType(
    tenantId,
    RESCHEDULE_PROPOSED_EVENT,
    100,
  )
  const seen = new Set<string>()
  const views: RescheduleProposalView[] = []
  for (const e of entries) {
    if (!e.subjectId || seen.has(e.subjectId)) continue
    seen.add(e.subjectId)
    const m = (e.metadata ?? {}) as Record<string, unknown>
    views.push({
      workOrderId: e.subjectId,
      outcome: (m.outcome as ProposalOutcome) ?? "no_action",
      disposition: (m.disposition as RescheduleProposalView["disposition"]) ?? null,
      nonCompletionReason:
        (m.nonCompletionReason as RescheduleProposalView["nonCompletionReason"]) ?? null,
      technicianName: (m.technicianName as string | null) ?? null,
      proposedDate: (m.proposedDate as string | null) ?? null,
      proposedStartMinute: (m.proposedStartMinute as number | null) ?? null,
      proposedEndMinute: (m.proposedEndMinute as number | null) ?? null,
      occurredAt: e.occurredAt,
    })
  }
  return views
}
