import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { env } from "@/lib/config/env"
import { emailConfigStatus, sendEmail } from "@/lib/email/send-email"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  planReschedule,
  type RescheduleMode,
} from "@/modules/scheduling/application/use-cases/plan-reschedule"
import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import { SERVICE_PERMISSIONS } from "@/modules/authorization/domain/permission"
import type { CommunicationChannel } from "@/modules/notifications/domain/communication-channel"
import { EmailChannel } from "@/modules/notifications/infrastructure/email-channel"
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
import {
  DISPATCH_BLOCKER_ACTIONS,
  DISPATCH_BLOCKER_LABELS,
} from "@/modules/scheduling/domain/dispatch-confidence"
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
  listWorkOrdersForCase,
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
/**
 * Coordinación visible (PR2): margen de preparación/desplazamiento y redondeo del
 * inicio. Nexus NO agenda a la hora exacta de entrada del caso; propone el primer
 * slot coordinado (≥ ahora + lead, en medias horas). Es la evidencia de que está
 * coordinando recursos y agenda, no solo creando una orden.
 */
const AUTO_DISPATCH_LEAD_MINUTES = 60
const AUTO_DISPATCH_SLOT_GRANULARITY_MINUTES = 30
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
      leadMinutes: AUTO_DISPATCH_LEAD_MINUTES,
      slotGranularityMinutes: AUTO_DISPATCH_SLOT_GRANULARITY_MINUTES,
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

const ASSIGNMENT_ACCEPTED_EVENT = "assignment.accepted"
const CONFIRMATION_SENT_EVENT = "customer.confirmation.sent"
const CONFIRMATION_SKIPPED_EVENT = "customer.confirmation.skipped"
const CONFIRMATION_FAILED_EVENT = "customer.confirmation.failed"
const ENROUTE_SENT_EVENT = "customer.enroute.sent"
const ENROUTE_SKIPPED_EVENT = "customer.enroute.skipped"
const ENROUTE_FAILED_EVENT = "customer.enroute.failed"

type CustomerCommContext = {
  customerEmail: string | null
  techName: string
  company: string
  woNumber: string
  caseSubject: string
  startIso: string | null
  /** Token de seguimiento del caso (para el link público en los correos). */
  trackingToken: string | null
}

/** Link público de seguimiento, o null si falta token o URL base. */
function trackingUrl(trackingToken: string | null): string | null {
  if (!trackingToken || !env.NEXT_PUBLIC_APP_URL) return null
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/seguimiento/${trackingToken}`
}

/**
 * Resolución (solo lectura, cliente admin) de los datos que ambas comunicaciones
 * al cliente comparten: email (reporter_email → contacts.email), técnico, empresa,
 * número/asunto de la orden y arranque programado. Sin esto, las dos funciones
 * duplicarían las mismas cuatro consultas.
 */
async function resolveCustomerCommContext(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  tenantId: UUID,
  workOrderId: UUID,
  assignmentId: UUID,
): Promise<CustomerCommContext> {
  const { data: wo } = await admin
    .from("work_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", workOrderId)
    .maybeSingle()
  const { data: asg } = await admin
    .from("work_order_assignments")
    .select("technician_id, scheduled_start")
    .eq("tenant_id", tenantId)
    .eq("id", assignmentId)
    .maybeSingle()
  const woRow = wo as Record<string, unknown> | null
  const caseId = (woRow?.case_id as string | null) ?? null

  let customerEmail: string | null = null
  let caseSubject = (woRow?.subject as string | null) ?? "su solicitud"
  let trackingToken: string | null = null
  if (caseId) {
    const { data: c } = await admin.from("cases").select("*").eq("id", caseId).maybeSingle()
    const cRow = c as Record<string, unknown> | null
    customerEmail = (cRow?.reporter_email as string | null) ?? null
    caseSubject = (cRow?.subject as string | null) ?? caseSubject
    trackingToken = (cRow?.tracking_token as string | null) ?? null
    const contactId = (cRow?.contact_id as string | null) ?? null
    if (!customerEmail && contactId) {
      const { data: ct } = await admin.from("contacts").select("email").eq("id", contactId).maybeSingle()
      customerEmail = (ct as { email?: string | null } | null)?.email ?? null
    }
  }

  const { data: tech } = await admin
    .from("technicians")
    .select("first_name, last_name")
    .eq("id", asg?.technician_id ?? "")
    .maybeSingle()
  const techName = tech ? `${tech.first_name} ${tech.last_name}` : "su técnico asignado"
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", tenantId).maybeSingle()
  const company = (tenant as { name?: string } | null)?.name ?? "Nexus"
  const startIso =
    (asg?.scheduled_start as string | null) ?? (woRow?.scheduled_start as string | null) ?? null
  const woNumber = (woRow?.work_order_number as string | null) ?? "—"

  return { customerEmail, techName, company, woNumber, caseSubject, startIso, trackingToken }
}

/**
 * Hito D — al aceptar el técnico (pending → accepted) confirma la visita al
 * cliente UNA sola vez (idempotente por evento de auditoría) y solo entonces.
 * Reutiliza la transición existente y `sendEmail`; no crea estados ni flujos.
 * Todo lo lee/escribe con cliente admin (acción de sistema, RLS bypass).
 */
export async function confirmCustomerOnAcceptance(input: {
  tenantId: UUID
  requestId: UUID
  assignmentId: UUID
  workOrderId: UUID
}): Promise<{ confirmed: boolean; skipped?: string }> {
  const admin = createAdminSupabaseClient()
  const audit = new SupabaseAuditRepository(() => admin)

  // Idempotencia: si ya hay confirmación para este assignment, no repetir.
  const prior = await audit.listBySubject(input.tenantId, input.assignmentId, 50)
  if (prior.some((e) => e.eventType === CONFIRMATION_SENT_EVENT)) {
    return { confirmed: false, skipped: "already_sent" }
  }

  const nowIso = new Date().toISOString()
  // Evento de negocio: aceptación (actor sistema), reconstruye "cuándo aceptó".
  if (!prior.some((e) => e.eventType === ASSIGNMENT_ACCEPTED_EVENT)) {
    await audit.append({
      eventType: ASSIGNMENT_ACCEPTED_EVENT,
      actorType: "system",
      actorId: null,
      tenantId: input.tenantId,
      subjectType: "work_order_assignment",
      subjectId: input.assignmentId,
      action: "assignment.accepted",
      metadata: { workOrderId: input.workOrderId, acceptedAt: nowIso },
      requestId: input.requestId,
      source: "system",
    })
  }

  // Datos de la confirmación (lectura admin, compartida con el aviso de salida).
  const ctx = await resolveCustomerCommContext(
    admin,
    input.tenantId,
    input.workOrderId,
    input.assignmentId,
  )
  const { customerEmail, techName, company, woNumber, caseSubject, startIso } = ctx

  if (!customerEmail) {
    await audit.append({
      eventType: CONFIRMATION_SKIPPED_EVENT,
      actorType: "system",
      actorId: null,
      tenantId: input.tenantId,
      subjectType: "work_order_assignment",
      subjectId: input.assignmentId,
      action: "customer.confirmation.skipped",
      metadata: { reason: "no_email", workOrderId: input.workOrderId },
      requestId: input.requestId,
      source: "system",
    })
    return { confirmed: false, skipped: "no_email" }
  }

  const when = startIso
    ? new Date(startIso).toLocaleString("es-CO", {
        timeZone: TENANT_TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "por confirmar"

  const deliverability = emailConfigStatus()
  const confirmTrackUrl = trackingUrl(ctx.trackingToken)
  try {
    await sendEmail({
      to: customerEmail,
      subject: "Visita confirmada",
      text: [
        `Hola,`,
        ``,
        `Tu visita ha sido confirmada.`,
        ``,
        `Orden: ${woNumber}`,
        `Asunto: ${caseSubject}`,
        `Técnico: ${techName}`,
        `Fecha y hora: ${when}`,
        `Empresa responsable: ${company}`,
        ``,
        `Estado: Visita confirmada`,
        ...(confirmTrackUrl
          ? ["", `Sigue el avance de tu visita en tiempo real:`, confirmTrackUrl]
          : []),
        ``,
        `Gracias,`,
        `${company}`,
      ].join("\n"),
    })
  } catch (error) {
    // Observabilidad: el fallo de envío queda auditado (no se traga en silencio).
    // No marcamos `sent`, así un reintento idempotente puede volver a intentarlo.
    await audit.append({
      eventType: CONFIRMATION_FAILED_EVENT,
      actorType: "system",
      actorId: null,
      tenantId: input.tenantId,
      subjectType: "work_order_assignment",
      subjectId: input.assignmentId,
      action: "customer.confirmation.failed",
      metadata: {
        displayActor: "Nexus Autonomous Dispatch",
        to: customerEmail,
        workOrderId: input.workOrderId,
        deliverability,
        error: error instanceof Error ? error.message : String(error),
      },
      requestId: input.requestId,
      source: "system",
    })
    throw error
  }

  await audit.append({
    eventType: CONFIRMATION_SENT_EVENT,
    actorType: "system",
    actorId: null,
    tenantId: input.tenantId,
    subjectType: "work_order_assignment",
    subjectId: input.assignmentId,
    action: "customer.confirmation.sent",
    metadata: {
      displayActor: "Nexus Autonomous Dispatch",
      to: customerEmail,
      workOrderId: input.workOrderId,
      workOrderNumber: woNumber,
      technician: techName,
      scheduledStart: startIso,
      // Honestidad de entrega: "sandbox" significa que el cliente real NO recibe.
      deliverability,
      confirmedAt: nowIso,
    },
    requestId: input.requestId,
    source: "system",
  })

  return { confirmed: true }
}

/**
 * Acción lateral de comunicación (NO transición): cuando el técnico sale hacia el
 * cliente, avisa UNA sola vez (idempotente por evento de auditoría). No modifica
 * la máquina de estados de ejecución; el técnico permanece en `accepted`.
 *
 * Depende del contrato `CommunicationChannel`, no de un canal concreto: el MVP
 * inyecta `EmailChannel`; WhatsApp/SMS se enchufan sin tocar esta lógica.
 * Reutiliza la resolución de contexto de `confirmCustomerOnAcceptance`.
 */
export async function notifyCustomerEnRoute(input: {
  tenantId: UUID
  requestId: UUID
  assignmentId: UUID
  workOrderId: UUID
  triggeredByUserId: UUID
  channel?: CommunicationChannel
}): Promise<{ sent: boolean; skipped?: string }> {
  const channel = input.channel ?? new EmailChannel()
  const admin = createAdminSupabaseClient()
  const audit = new SupabaseAuditRepository(() => admin)

  // Idempotencia: máximo un aviso de salida por assignment (mismo patrón que
  // customer.confirmation.sent).
  const prior = await audit.listBySubject(input.tenantId, input.assignmentId, 50)
  if (prior.some((e) => e.eventType === ENROUTE_SENT_EVENT)) {
    return { sent: false, skipped: "already_sent" }
  }

  const ctx = await resolveCustomerCommContext(
    admin,
    input.tenantId,
    input.workOrderId,
    input.assignmentId,
  )

  if (!ctx.customerEmail) {
    await audit.append({
      eventType: ENROUTE_SKIPPED_EVENT,
      actorType: "system",
      actorId: null,
      tenantId: input.tenantId,
      subjectType: "work_order_assignment",
      subjectId: input.assignmentId,
      action: "customer.enroute.skipped",
      metadata: { reason: "no_email", workOrderId: input.workOrderId },
      requestId: input.requestId,
      source: "field",
    })
    return { sent: false, skipped: "no_email" }
  }

  const nowIso = new Date().toISOString()
  const deliverability = channel.kind === "email" ? emailConfigStatus() : "production"
  try {
    const enrouteTrackUrl = trackingUrl(ctx.trackingToken)
    await channel.send({
      to: ctx.customerEmail,
      subject: "Su técnico va en camino",
      body: [
        `Hola,`,
        ``,
        `Tu técnico va en camino para atender tu solicitud.`,
        ``,
        `Orden: ${ctx.woNumber}`,
        `Asunto: ${ctx.caseSubject}`,
        `Técnico: ${ctx.techName}`,
        ``,
        `Por favor prepárate para recibir la visita.`,
        ...(enrouteTrackUrl
          ? ["", `Sigue el avance en tiempo real:`, enrouteTrackUrl]
          : []),
        ``,
        `Gracias,`,
        `${ctx.company}`,
      ].join("\n"),
    })
  } catch (error) {
    // Observabilidad: fallo de envío auditado; no marcamos `sent`, así un
    // reintento idempotente puede reintentar.
    await audit.append({
      eventType: ENROUTE_FAILED_EVENT,
      actorType: "system",
      actorId: null,
      tenantId: input.tenantId,
      subjectType: "work_order_assignment",
      subjectId: input.assignmentId,
      action: "customer.enroute.failed",
      metadata: {
        displayActor: "Nexus Field Execution",
        channel: channel.kind,
        to: ctx.customerEmail,
        workOrderId: input.workOrderId,
        deliverability,
        triggeredByUserId: input.triggeredByUserId,
        error: error instanceof Error ? error.message : String(error),
      },
      requestId: input.requestId,
      source: "field",
    })
    throw error
  }

  await audit.append({
    eventType: ENROUTE_SENT_EVENT,
    actorType: "system",
    actorId: null,
    tenantId: input.tenantId,
    subjectType: "work_order_assignment",
    subjectId: input.assignmentId,
    action: "customer.enroute.sent",
    metadata: {
      displayActor: "Nexus Field Execution",
      channel: channel.kind,
      to: ctx.customerEmail,
      workOrderId: input.workOrderId,
      workOrderNumber: ctx.woNumber,
      technician: ctx.techName,
      triggeredByUserId: input.triggeredByUserId,
      deliverability,
      sentAt: nowIso,
    },
    requestId: input.requestId,
    source: "field",
  })

  return { sent: true }
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

/**
 * Excepción de despacho (H2): un caso web `new` sin WO que el motor NO pudo
 * despachar con confianza (HOLD o ESCALATE). Hace visible "qué falló, por qué y
 * qué acción tomar" para que ningún caso desaparezca de la operación.
 */
export type DispatchException = {
  caseId: UUID
  caseNumber: string
  subject: string
  priority: string
  verdict: "HOLD" | "ESCALATE"
  skillLabel: string | null
  confidenceScore: number
  /** Claves estables de bloqueo (auditoría/tests). */
  blockers: string[]
  /** Bloqueos legibles (es-CO). */
  reasons: string[]
  /** Acción operativa sugerida (1ra causa). */
  suggestedAction: string
}

export type DispatchInbox = {
  proposals: AssistedDispatchProposal[]
  exceptions: DispatchException[]
}

/** Casos nuevos de origen web a despachar (cap defensivo). */
const ASSISTED_INBOX_LIMIT = 50

/**
 * Bandeja de Despacho (Hito C + H2): escanea en UNA pasada los casos `new` de
 * origen `web` sin WO y recomputa el plan server-side (no confía en estado
 * persistido, igual que plan-reschedule). Devuelve:
 *  - `proposals`: PROCEED → aprobables en un clic vía `runAutoDispatchForCase`.
 *  - `exceptions`: HOLD/ESCALATE → bandeja de excepciones (qué falló y por qué).
 * SOLO LECTURA. Ningún caso bloqueado queda invisible.
 */
export async function listDispatchInbox(tenantId: UUID): Promise<DispatchInbox> {
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
    leadMinutes: AUTO_DISPATCH_LEAD_MINUTES,
    slotGranularityMinutes: AUTO_DISPATCH_SLOT_GRANULARITY_MINUTES,
  }

  const proposals: AssistedDispatchProposal[] = []
  const exceptions: DispatchException[] = []
  for (const c of webCases) {
    // Excluir casos que YA tienen una WO (no re-despachar).
    const existing = await listWorkOrdersForCase(tenantId, c.id)
    if (existing.length > 0) continue

    const plan = await planAutoDispatch(deps, {
      tenantId,
      caseId: c.id,
      description: c.description ?? c.subject,
      slaDueAt: c.slaDueAt,
      availableSkills,
    })

    if (plan.verdict === "PROCEED" && plan.chosen && plan.startsAt && plan.endsAt) {
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
      continue
    }

    // HOLD / ESCALATE → excepción visible.
    const blockers = plan.confidence.blockers
    exceptions.push({
      caseId: c.id,
      caseNumber: c.caseNumber,
      subject: c.subject,
      priority: plan.classification.priority,
      verdict: plan.verdict === "HOLD" ? "HOLD" : "ESCALATE",
      skillLabel: plan.classification.skillLabel,
      confidenceScore: plan.confidence.score,
      blockers,
      reasons: blockers.map((b) => DISPATCH_BLOCKER_LABELS[b] ?? b),
      suggestedAction:
        (blockers[0] && DISPATCH_BLOCKER_ACTIONS[blockers[0]]) ??
        "Revisa el caso y asigna manualmente.",
    })
  }
  return { proposals, exceptions }
}

/** Compatibilidad: solo las propuestas PROCEED. */
export async function listAssistedDispatchProposals(
  tenantId: UUID,
): Promise<AssistedDispatchProposal[]> {
  return (await listDispatchInbox(tenantId)).proposals
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
