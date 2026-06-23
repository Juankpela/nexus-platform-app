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
  /** Para suscribir la página pública al canal de actualización en vivo (broadcast). */
  tenantId: string
  tenantName: string
  caseNumber: string
  /** Número de la orden de trabajo asociada (WO-XXXX), o null si aún no se despacha. */
  workOrderNumber: string | null
  subject: string
  technicianName: string | null
  scheduledStart: string | null
  /** Hora estimada de llegada (ISO) para el contador de desplazamiento, o null. */
  etaArrivalAt: string | null
  /** Duración estimada del desplazamiento (min) — texto estable del contador. */
  etaDurationMinutes: number | null
  milestones: LifecycleMilestone[]
}

/** Núcleo: arma el input de la línea de vida desde el caso + (opcional) su WO. */
async function resolveLifecycleInput(
  admin: Admin,
  tenantId: UUID,
  reportedAt: string,
  woRow: Row,
): Promise<{
  input: ServiceLifecycleInput
  technicianName: string | null
  enRouteEta: { arrivalAt: string; durationMinutes: number } | null
}> {
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
  if (!woRow) return { input: empty, technicianName: null, enRouteEta: null }

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
  // De ese mismo evento sacamos el ETA guardado (arrival/duración) para el
  // contador de desplazamiento — el mismo dato que ve el admin.
  let enRouteAt: string | null = null
  let enRouteEta: { arrivalAt: string; durationMinutes: number } | null = null
  if (asgRow?.id) {
    const { data: ev } = await admin
      .from("audit_events")
      .select("occurred_at, metadata")
      .eq("subject_id", asgRow.id as string)
      .eq("event_type", ENROUTE_SENT_EVENT)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const evRow = ev as { occurred_at?: string; metadata?: { eta?: { arrivalAt?: string; durationMinutes?: number } } } | null
    enRouteAt = evRow?.occurred_at ?? null
    const eta = evRow?.metadata?.eta
    if (eta?.arrivalAt && typeof eta.durationMinutes === "number") {
      enRouteEta = { arrivalAt: eta.arrivalAt, durationMinutes: eta.durationMinutes }
    }
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

  // Respaldo por ESTADO de la WO: una orden puede completarse por fuera de la
  // ejecución de campo (cierre manual, WO desde cotización, datos de carga). Si la
  // WO está "completada" pero no hay sello de ejecución, marcamos el hito de
  // completado con el cierre real de la WO; la monotonía de buildServiceLifecycle
  // marca como cumplidos los hitos previos (aceptó/en camino/en sitio/trabajando).
  const woStatus = woRow.status as string | null
  const execCompletedAt = (exec?.completed_at as string | null) ?? null
  const completedAt =
    execCompletedAt ??
    (woStatus === "completed"
      ? ((woRow.actual_end as string | null) ?? (woRow.updated_at as string | null) ?? null)
      : null)

  return {
    technicianName,
    enRouteEta,
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
      completedAt,
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
      .select("id, work_order_number, status, scheduled_start, created_at, actual_end, updated_at")
      .eq("tenant_id", tenantId)
      .eq("case_id", caseRow.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { input, technicianName, enRouteEta } = await resolveLifecycleInput(
      admin,
      tenantId,
      caseRow.created_at as string,
      wo as Row,
    )

    // Contador de desplazamiento: vivo solo mientras el técnico va en camino y aún
    // no llega/cierra (mismo criterio que la tarjeta de operación del admin). El
    // reloj del cliente (EtaCountdown) muestra "Llegando" si la hora ya pasó.
    const arrived = !!input.arrivedAt || !!input.completedAt
    const showEta = !!enRouteEta && !!input.enRouteAt && !arrived

    const { data: tenant } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle()

    return {
      tenantId,
      tenantName: (tenant as { name?: string } | null)?.name ?? "Nexus",
      caseNumber: (caseRow.case_number as string).replace(/^CASE/i, "REP"),
      workOrderNumber: (wo as Row)?.work_order_number as string | null ?? null,
      subject: (caseRow.subject as string | null) ?? "Tu solicitud",
      technicianName,
      scheduledStart: input.scheduledStart,
      etaArrivalAt: showEta ? enRouteEta!.arrivalAt : null,
      etaDurationMinutes: showEta ? enRouteEta!.durationMinutes : null,
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
      .select("id, status, scheduled_start, created_at, case_id, actual_end, updated_at")
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
