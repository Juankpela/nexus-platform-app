import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  planReschedule,
  type RescheduleMode,
} from "@/modules/scheduling/application/use-cases/plan-reschedule"
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
import {
  createWorkOrderRecord,
  getCaseRecord,
  listTenantCases,
  listTenantSkills,
} from "@/modules/service/composition"
import type { EligibilityReasons } from "@/modules/scheduling/domain/eligibility"
import { planAutoDispatch } from "@/modules/scheduling/application/use-cases/plan-auto-dispatch"
import { KeywordReportClassifier } from "@/modules/scheduling/infrastructure/keyword-report-classifier"
import { SupabaseDispatchCandidateReader } from "@/modules/scheduling/infrastructure/supabase-dispatch-candidate-reader"
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
 * Human-triggered reschedule (ADR-032): recompute the plan fresh, then write via
 * the validated assign/reassign use-cases. Reads use the user (RLS) client; the
 * action gate (schedulingWrite) authorizes it.
 */
export async function applyRescheduleRecord(input: {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  workOrderId: UUID
  mode: RescheduleMode
}) {
  const client = await createServerSupabaseClient()
  const plan = await planReschedule(
    {
      candidates: new SupabaseRescheduleCandidateReader(client, TENANT_TIMEZONE),
      scheduling: schedulingRepo(),
      resolver: new SupabaseEligibilityResolver(TENANT_TIMEZONE),
      nowMs: Date.now(),
      timeZone: TENANT_TIMEZONE,
      horizonDays: RESCHEDULE_HORIZON_DAYS,
    },
    { tenantId: input.tenantId, workOrderId: input.workOrderId, mode: input.mode },
  )

  if (plan.activeAssignmentId) {
    await reassignWorkOrderRecord({
      actorId: input.actorId,
      tenantId: input.tenantId,
      requestId: input.requestId,
      id: plan.activeAssignmentId,
      technicianId: plan.technicianId,
      scheduledStart: plan.startsAt,
      scheduledEnd: plan.endsAt,
    })
  } else {
    await assignWorkOrderRecord({
      actorId: input.actorId,
      tenantId: input.tenantId,
      requestId: input.requestId,
      data: {
        workOrderId: input.workOrderId,
        technicianId: plan.technicianId,
        scheduledStart: plan.startsAt,
        scheduledEnd: plan.endsAt,
      },
    })
  }
  return plan
}

/** Horizonte de búsqueda de slot para el despacho autónomo (ADR-033). */
const AUTO_DISPATCH_HORIZON_DAYS = 14
/** Umbral de confianza por defecto (config por tenant en hitos posteriores). */
const AUTO_DISPATCH_CONFIDENCE_THRESHOLD = 0.7
/** Actor del sistema para la atribución "Nexus Autonomous Dispatch". */
const AUTONOMOUS_DISPATCH_EVENT = "autonomous_dispatch.assigned"

export type AutoDispatchResult = {
  verdict: "PROCEED" | "HOLD" | "ESCALATE"
  workOrderId: UUID | null
  assignmentId: UUID | null
  technicianName: string | null
  startsAt: string | null
  endsAt: string | null
  confidenceScore: number
  blockers: string[]
}

/**
 * Circuito autónomo (ADR-033, Hito A): clasifica un caso, planifica
 * determinísticamente (selección + slot vía motores existentes) y, si Dispatch
 * Confidence da PROCEED, crea la Work Order y la asigna reutilizando los
 * use-cases validados. La DECISIÓN es 100% automática; toda asignación queda
 * auditada como `actorType:"system"` ("Nexus Autonomous Dispatch") vía el cliente
 * admin (evade la política RLS `actor_id = auth.uid()`). No notifica al cliente.
 */
export async function runAutoDispatchForCase(input: {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  caseId: UUID
}): Promise<AutoDispatchResult> {
  const [serviceCase, skills] = await Promise.all([
    getCaseRecord(input.tenantId, input.caseId),
    listTenantSkills(input.tenantId),
  ])
  if (!serviceCase) {
    throw new ApplicationError("Caso no encontrado.", "CASE_NOT_FOUND")
  }

  const plan = await planAutoDispatch(
    {
      classifier: new KeywordReportClassifier(),
      candidates: new SupabaseDispatchCandidateReader(TENANT_TIMEZONE),
      nowMs: Date.now(),
      timeZone: TENANT_TIMEZONE,
      horizonDays: AUTO_DISPATCH_HORIZON_DAYS,
      confidenceThreshold: AUTO_DISPATCH_CONFIDENCE_THRESHOLD,
    },
    {
      tenantId: input.tenantId,
      caseId: input.caseId,
      description: serviceCase.description ?? serviceCase.subject,
      slaDueAt: serviceCase.slaDueAt,
      availableSkills: skills.map((s) => ({ id: s.id, name: s.name, aliases: s.aliases })),
    },
  )

  let workOrderId: UUID | null = null
  let assignmentId: UUID | null = null

  if (plan.verdict === "PROCEED" && plan.chosen && plan.startsAt && plan.endsAt) {
    const workOrder = await createWorkOrderRecord({
      actorId: input.actorId,
      tenantId: input.tenantId,
      requestId: input.requestId,
      data: {
        subject: serviceCase.subject,
        description: serviceCase.description,
        priority: plan.classification.priority,
        companyId: serviceCase.companyId,
        caseId: serviceCase.id,
        assetId: serviceCase.assetId,
        scheduledStart: plan.startsAt,
        scheduledEnd: plan.endsAt,
        slaDueAt: serviceCase.slaDueAt,
        laborHours: null,
        resolutionSummary: null,
        completionNotes: null,
      },
    })
    workOrderId = workOrder.id

    const assignment = await assignWorkOrderRecord({
      actorId: input.actorId,
      tenantId: input.tenantId,
      requestId: input.requestId,
      data: {
        workOrderId: workOrder.id,
        technicianId: plan.chosen.technicianId,
        scheduledStart: plan.startsAt,
        scheduledEnd: plan.endsAt,
      },
    })
    assignmentId = assignment.id

    // Notificación individual al técnico (in-app). Reusa la infra de
    // notifications con cliente admin (RLS: insert para otro usuario). El técnico
    // sin usuario vinculado simplemente no recibe (no bloquea el despacho).
    const admin = createAdminSupabaseClient()
    const { data: techRow } = await admin
      .from("technicians")
      .select("user_id")
      .eq("tenant_id", input.tenantId)
      .eq("id", plan.chosen.technicianId)
      .maybeSingle()
    const recipientUserId = (techRow as { user_id?: string | null } | null)?.user_id ?? null
    if (recipientUserId) {
      const when = new Date(plan.startsAt).toLocaleString("es-CO", {
        timeZone: TENANT_TIMEZONE,
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
      await new SupabaseNotificationRepository(() => admin).createMany(input.tenantId, [
        {
          recipientUserId,
          type: "work_order_assigned",
          title: `Nueva orden de trabajo · ${workOrder.workOrderNumber}`,
          body: `${serviceCase.subject} · ${plan.classification.skillLabel ?? "Servicio"} · ${when} · prioridad ${plan.classification.priority}`,
          link: `work-orders/${workOrder.id}`,
        },
      ])
    }
  }

  // Evento de atribución al sistema (admin client → RLS bypass). Persiste la
  // explicabilidad completa para responder "por qué este técnico/horario/descartes".
  await new SupabaseAuditRepository(() => createAdminSupabaseClient()).append({
    eventType: AUTONOMOUS_DISPATCH_EVENT,
    actorType: "system",
    actorId: null,
    tenantId: input.tenantId,
    subjectType: "case",
    subjectId: input.caseId,
    action: "autonomous_dispatch.evaluated",
    metadata: {
      displayActor: "Nexus Autonomous Dispatch",
      verdict: plan.verdict,
      confidence: plan.confidence,
      classification: plan.classification,
      workOrderId,
      assignmentId,
      chosen: plan.chosen
        ? {
            technicianId: plan.chosen.technicianId,
            technicianName: plan.chosen.technicianName,
            reasons: plan.chosen.reasons,
            slot: plan.chosen.slot,
          }
        : null,
      discarded: plan.discarded.map((d) => ({
        technicianId: d.technicianId,
        technicianName: d.technicianName,
        reasons: d.reasons,
      })),
    },
    requestId: input.requestId,
    source: "system",
  })

  return {
    verdict: plan.verdict,
    workOrderId,
    assignmentId,
    technicianName: plan.chosen?.technicianName ?? null,
    startsAt: plan.startsAt,
    endsAt: plan.endsAt,
    confidenceScore: plan.confidence.score,
    blockers: plan.confidence.blockers,
  }
}

export type AssistedDispatchProposal = {
  caseId: UUID
  caseNumber: string
  subject: string
  skillLabel: string | null
  confidenceScore: number
  technicianId: UUID
  technicianName: string
  chosenReasons: EligibilityReasons
  startsAt: string
  endsAt: string
  priority: string
  discarded: { technicianName: string; reasons: EligibilityReasons }[]
}

/** Casos nuevos de origen web a despachar (cap defensivo). */
const ASSISTED_INBOX_LIMIT = 50

/**
 * Bandeja de Despacho Asistido (Hito C): casos `new` de origen `web` para los que
 * el motor produce PROCEED y aún no tienen WO. SOLO LECTURA — recomputa el plan
 * server-side (no confía en estado persistido), igual que plan-reschedule. La
 * aprobación del supervisor aplica vía `runAutoDispatchForCase`.
 */
export async function listAssistedDispatchProposals(
  tenantId: UUID,
): Promise<AssistedDispatchProposal[]> {
  const [casesPage, skills] = await Promise.all([
    listTenantCases(tenantId, { search: null, status: "new", priority: null, ownerId: null }, 1, ASSISTED_INBOX_LIMIT),
    listTenantSkills(tenantId),
  ])
  const webCases = casesPage.items.filter((c) => c.origin === "web")
  const availableSkills = skills.map((s) => ({ id: s.id, name: s.name, aliases: s.aliases }))

  const deps = {
    classifier: new KeywordReportClassifier(),
    candidates: new SupabaseDispatchCandidateReader(TENANT_TIMEZONE),
    nowMs: Date.now(),
    timeZone: TENANT_TIMEZONE,
    horizonDays: AUTO_DISPATCH_HORIZON_DAYS,
    confidenceThreshold: AUTO_DISPATCH_CONFIDENCE_THRESHOLD,
  }

  const proposals: AssistedDispatchProposal[] = []
  for (const c of webCases) {
    const plan = await planAutoDispatch(deps, {
      tenantId,
      caseId: c.id,
      description: c.description ?? c.subject,
      slaDueAt: c.slaDueAt,
      availableSkills,
    })
    if (plan.verdict !== "PROCEED" || !plan.chosen || !plan.startsAt || !plan.endsAt) continue
    proposals.push({
      caseId: c.id,
      caseNumber: c.caseNumber,
      subject: c.subject,
      skillLabel: plan.classification.skillLabel,
      confidenceScore: plan.confidence.score,
      technicianId: plan.chosen.technicianId,
      technicianName: plan.chosen.technicianName,
      chosenReasons: plan.chosen.reasons,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
      priority: plan.classification.priority,
      discarded: plan.discarded.map((d) => ({ technicianName: d.technicianName, reasons: d.reasons })),
    })
  }
  return proposals
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
