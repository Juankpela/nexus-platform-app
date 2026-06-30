import { computeSlaStatus, type SlaStatus } from "@/modules/service/domain/sla"
import type { InterventionType, RawCommitment } from "./commitment"

/**
 * Juicio determinístico de un compromiso (puro). Interpreta el estado existente:
 * deriva la ventana accionable de la clasificación SLA YA EXISTENTE
 * (`computeSlaStatus`) — sin umbrales nuevos — y el punto de no retorno con datos
 * reales cuando existen; si no, lo declara UNKNOWN (nunca lo sustituye por el plazo).
 */

export type Estado = "sano" | "en_riesgo_accionable" | "perdido" | "sin_datos"

/**
 * Punto de no retorno = plazo − duración del trabajo (instante límite para
 * empezar y aún cumplir). Solo computable si hay duración estimada (asignación).
 */
export type PointOfNoReturn = { ms: number | null; status: "KNOWN" | "UNKNOWN" }

export type Judgment = {
  commitment: RawCommitment
  slaStatus: SlaStatus | null
  estado: Estado
  inActionableWindow: boolean
  pointOfNoReturn: PointOfNoReturn
  /** ms hasta el plazo SLA (para ordenar por urgencia); null si no hay plazo. */
  msToSlaDue: number | null
  /** El plan actual termina después del plazo (enriquece evidencia; no redefine la ventana). */
  trajectoryOvershoots: boolean
  requiredIntervention: InterventionType
  reasonWord: string
  tone: "tension" | "watch"
}

const MIN_MS = 60_000

export function judge(c: RawCommitment, now: Date): Judgment {
  const nowMs = now.getTime()
  const dueMs = c.slaDueAt ? new Date(c.slaDueAt).getTime() : null

  // Ventana accionable: clasificación SLA EXISTENTE (at_risk = 25% final). Sin umbral nuevo.
  const slaStatus = computeSlaStatus({
    slaDueAt: c.slaDueAt,
    priority: c.priority,
    resolvedAt: c.resolvedAt,
    closedAt: null,
    now,
  })

  // Punto de no retorno SOLO con datos reales (plazo + duración estimada).
  // Sin duración ⇒ UNKNOWN. Nunca se aproxima ni se sustituye por el plazo.
  const pointOfNoReturn: PointOfNoReturn =
    dueMs != null && c.estimatedDurationMinutes != null
      ? { ms: dueMs - c.estimatedDurationMinutes * MIN_MS - nowMs, status: "KNOWN" }
      : { ms: null, status: "UNKNOWN" }

  const msToSlaDue = dueMs != null ? dueMs - nowMs : null

  const trajectoryOvershoots =
    c.scheduledEnd != null && dueMs != null
      ? new Date(c.scheduledEnd).getTime() > dueMs
      : false

  let estado: Estado
  if (slaStatus == null) estado = "sin_datos"
  else if (slaStatus === "breached") estado = "perdido"
  else if (slaStatus === "at_risk") estado = "en_riesgo_accionable"
  else estado = "sano" // on_track | met
  const inActionableWindow = estado === "en_riesgo_accionable"

  // Categoría de intervención: derivada del constraint observable. Nunca persona/fecha/ruta.
  let requiredIntervention: InterventionType
  if (!c.hasActiveAssignment) requiredIntervention = "ASSIGN_TECHNICIAN"
  else if (trajectoryOvershoots) requiredIntervention = "RESCHEDULE"
  else requiredIntervention = "REVIEW"

  const reasonWord = !c.hasActiveAssignment
    ? "Sin asignar"
    : trajectoryOvershoots
      ? "Plazo"
      : "En riesgo"

  return {
    commitment: c,
    slaStatus,
    estado,
    inActionableWindow,
    pointOfNoReturn,
    msToSlaDue,
    trajectoryOvershoots,
    requiredIntervention,
    reasonWord,
    tone: inActionableWindow ? "tension" : "watch",
  }
}
