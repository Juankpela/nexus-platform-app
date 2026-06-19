import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import {
  buildServiceLifecycle,
  type LifecycleMilestone,
  type ServiceLifecycleInput,
} from "@/modules/service/domain/service-lifecycle"
import type { UUID } from "@/types/shared"

/**
 * Lectura (cliente admin, sin auth) de la "línea de vida" de una solicitud. Resuelve
 * la cadena Case → Work Order → Assignment → Execution → Invoice → Pago + el aviso
 * "en camino" (auditoría) y la traduce con `buildServiceLifecycle`. Dos entradas:
 *  - `getPublicTracking(token)` → para la página pública del cliente.
 *  - `getWorkOrderLifecycle(tenantId, workOrderId)` → para el detalle de WO (interno).
 * Ambas comparten el resolver. Todo best-effort: si una columna/relación falta
 * (p.ej. migración no aplicada), devuelve lo que pueda sin reventar.
 */

// Evento de auditoría del aviso de salida (mismo string que scheduling/composition).
const ENROUTE_SENT_EVENT = "customer.enroute.sent"

type Admin = ReturnType<typeof createAdminSupabaseClient>
type Row = Record<string, unknown> | null

export type PublicTrackingView = {
  tenantName: string
  caseNumber: string
  subject: string
  technicianName: string | null
  scheduledStart: string | null
  milestones: LifecycleMilestone[]
}

/** Núcleo: arma el input de la línea de vida desde el caso + (opcional) su WO. */
async function resolveLifecycleInput(
  admin: Admin,
  tenantId: UUID,
  reportedAt: string,
  woRow: Row,
): Promise<{ input: ServiceLifecycleInput; technicianName: string | null }> {
  const empty: ServiceLifecycleInput = {
    reportedAt,
    coordinatedAt: null,
    technicianName: null,
    scheduledStart: null,
    acceptedAt: null,
    enRouteAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    unableAt: null,
    unableReason: null,
    invoiceIssuedAt: null,
    paidAt: null,
  }
  if (!woRow) return { input: empty, technicianName: null }

  const workOrderId = woRow.id as string
  const cancelled = (woRow.status as string | null) === "cancelled"

  // Asignación más reciente (la coordinación de Nexus).
  const { data: asg } = await admin
    .from("work_order_assignments")
    .select("id, technician_id, scheduled_start, created_at")
    .eq("tenant_id", tenantId)
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const asgRow = asg as Row

  let technicianName: string | null = null
  if (asgRow?.technician_id) {
    const { data: tech } = await admin
      .from("technicians")
      .select("first_name, last_name")
      .eq("id", asgRow.technician_id as string)
      .maybeSingle()
    if (tech) technicianName = `${tech.first_name} ${tech.last_name}`.trim()
  }

  // Ejecución de campo (timestamps de aceptar/llegar/iniciar/cerrar).
  let exec: Row = null
  if (asgRow?.id) {
    const { data } = await admin
      .from("work_order_executions")
      .select(
        "accepted_at, arrived_at, started_at, completed_at, unable_to_complete_at, unable_reason, non_completion_reason",
      )
      .eq("assignment_id", asgRow.id as string)
      .maybeSingle()
    exec = data as Row
  }

  // Aviso "en camino" (acción lateral; no cambia estado, vive en auditoría).
  let enRouteAt: string | null = null
  if (asgRow?.id) {
    const { data: ev } = await admin
      .from("audit_events")
      .select("occurred_at")
      .eq("subject_id", asgRow.id as string)
      .eq("event_type", ENROUTE_SENT_EVENT)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    enRouteAt = (ev as { occurred_at?: string } | null)?.occurred_at ?? null
  }

  // Factura derivada de la WO.
  const { data: inv } = await admin
    .from("invoices")
    .select("id, status, issue_date")
    .eq("tenant_id", tenantId)
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const invRow = inv as Row
  const invStatus = (invRow?.status as string | null) ?? null
  const issued =
    invStatus === "issued" || invStatus === "partially_paid" || invStatus === "paid"
  const invoiceIssuedAt = issued ? ((invRow?.issue_date as string | null) ?? null) : null

  // Fecha real de pago (solo si la factura está pagada).
  let paidAt: string | null = null
  if (invStatus === "paid" && invRow?.id) {
    const { data: alloc } = await admin
      .from("payment_allocations")
      .select("payment_id")
      .eq("invoice_id", invRow.id as string)
    const paymentIds = ((alloc as { payment_id: string }[] | null) ?? []).map(
      (a) => a.payment_id,
    )
    if (paymentIds.length > 0) {
      const { data: pay } = await admin
        .from("payments")
        .select("payment_date")
        .in("id", paymentIds)
        .order("payment_date", { ascending: false })
        .limit(1)
        .maybeSingle()
      paidAt = (pay as { payment_date?: string } | null)?.payment_date ?? null
    }
  }

  const scheduledStart =
    (asgRow?.scheduled_start as string | null) ??
    (woRow.scheduled_start as string | null) ??
    null

  return {
    technicianName,
    input: {
      reportedAt,
      coordinatedAt:
        (asgRow?.created_at as string | null) ?? (woRow.created_at as string | null) ?? null,
      technicianName,
      scheduledStart,
      acceptedAt: (exec?.accepted_at as string | null) ?? null,
      enRouteAt,
      arrivedAt: (exec?.arrived_at as string | null) ?? null,
      startedAt: (exec?.started_at as string | null) ?? null,
      completedAt: (exec?.completed_at as string | null) ?? null,
      unableAt: (exec?.unable_to_complete_at as string | null) ?? null,
      unableReason: (exec?.unable_reason as string | null) ?? null,
      invoiceIssuedAt,
      paidAt,
      cancelled,
    },
  }
}

/** Página pública: resuelve la solicitud por su token de seguimiento. */
export async function getPublicTracking(
  token: string,
): Promise<PublicTrackingView | null> {
  const admin = createAdminSupabaseClient()
  try {
    const { data: c } = await admin
      .from("cases")
      .select("id, tenant_id, case_number, subject, created_at")
      .eq("tracking_token", token)
      .maybeSingle()
    const caseRow = c as Row
    if (!caseRow) return null

    const tenantId = caseRow.tenant_id as string
    const { data: wo } = await admin
      .from("work_orders")
      .select("id, status, scheduled_start, created_at")
      .eq("tenant_id", tenantId)
      .eq("case_id", caseRow.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { input, technicianName } = await resolveLifecycleInput(
      admin,
      tenantId,
      caseRow.created_at as string,
      wo as Row,
    )

    const { data: tenant } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle()

    return {
      tenantName: (tenant as { name?: string } | null)?.name ?? "Nexus",
      caseNumber: (caseRow.case_number as string).replace(/^CASE/i, "REP"),
      subject: (caseRow.subject as string | null) ?? "Tu solicitud",
      technicianName,
      scheduledStart: input.scheduledStart,
      milestones: buildServiceLifecycle(input),
    }
  } catch {
    return null
  }
}

/** Detalle interno: línea de vida de una Work Order concreta. */
export async function getWorkOrderLifecycle(
  tenantId: UUID,
  workOrderId: UUID,
): Promise<LifecycleMilestone[] | null> {
  const admin = createAdminSupabaseClient()
  try {
    const { data: wo } = await admin
      .from("work_orders")
      .select("id, status, scheduled_start, created_at, case_id")
      .eq("tenant_id", tenantId)
      .eq("id", workOrderId)
      .maybeSingle()
    const woRow = wo as Row
    if (!woRow) return null

    // reportedAt = creación del caso origen, si existe; si no, la WO.
    let reportedAt = (woRow.created_at as string | null) ?? new Date(0).toISOString()
    if (woRow.case_id) {
      const { data: c } = await admin
        .from("cases")
        .select("created_at")
        .eq("id", woRow.case_id as string)
        .maybeSingle()
      reportedAt = (c as { created_at?: string } | null)?.created_at ?? reportedAt
    }

    const { input } = await resolveLifecycleInput(admin, tenantId, reportedAt, woRow)
    return buildServiceLifecycle(input)
  } catch {
    return null
  }
}
