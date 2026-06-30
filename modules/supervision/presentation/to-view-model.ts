import type { Decision } from "@/components/operations/decision-card"
import type { Evidence } from "@/components/operations/evidence-panel"
import type { HealthSnapshot } from "@/components/operations/health-strip"
import type { SupervisionItem } from "@/components/operations/mock"
import { formatDateTime } from "@/lib/format/datetime"
import { formatCOP } from "@/lib/format/money"
import type { InterventionType } from "@/modules/supervision/domain/commitment"
import type { HealthFigures } from "@/modules/supervision/domain/health"
import type { Judgment } from "@/modules/supervision/domain/judge"

/**
 * Adaptador puro: dominio → contratos congelados de la UI (Decision /
 * SupervisionItem / HealthSnapshot / Evidence). Aquí vive TODO el formateo
 * (dinero, fechas, ventana) y la materialización de la incertidumbre como texto.
 * La UI NO se toca: este adaptador hace que el dato real encaje en el contrato
 * existente (valor null ⇒ "—" vía formatCOP; punto de no retorno UNKNOWN ⇒
 * "desconocido" + nota en evidencia).
 */

const PTNR_UNKNOWN_LABEL = "desconocido"
const PTNR_UNKNOWN_NOTE =
  "No es posible calcular el punto de no retorno porque la orden no tiene duración estimada. El sistema no sustituye este dato por el plazo ni realiza aproximaciones."
const TACIT_NOTE =
  "NEXUS no conoce los ajustes tácitos del supervisor (p. ej. un técnico que suele terminar antes)."
const NO_VALUE_NOTE =
  "Sin valor económico registrado: la orden aún no tiene factura asociada."

/** El campo congelado `recommendedAction` muestra esta etiqueta (no una acción concreta). */
const INTERVENTION_LABEL: Record<InterventionType, string> = {
  ASSIGN_TECHNICIAN: "Asignar técnico",
  RESCHEDULE: "Reprogramar",
  FOLLOW_UP_CUSTOMER: "Contactar cliente",
  ESCALATE_PARTS: "Escalar repuesto",
  REVIEW: "Revisar",
}

const INTERVENTION_SENTENCE: Record<InterventionType, string> = {
  ASSIGN_TECHNICIAN: "Intervención requerida: asignar un técnico (el supervisor elige a quién).",
  RESCHEDULE:
    "Intervención requerida: reprogramar el plan (reasignar, expeditar o renegociar — lo decide el supervisor).",
  FOLLOW_UP_CUSTOMER: "Intervención requerida: contactar al cliente.",
  ESCALATE_PARTS: "Intervención requerida: escalar el repuesto.",
  REVIEW: "Intervención requerida: revisar el compromiso.",
}

export type Capacity = { available: number; active: number }

/** Formatea la ventana al punto de no retorno. UNKNOWN ⇒ "desconocido" (nunca el plazo). */
export function formatWindow(ptnr: Judgment["pointOfNoReturn"]): string {
  if (ptnr.status === "UNKNOWN" || ptnr.ms == null) return PTNR_UNKNOWN_LABEL
  if (ptnr.ms <= 0) return "vencido"
  const hours = Math.floor(ptnr.ms / 3_600_000)
  if (hours < 1) return `en ${Math.max(1, Math.round(ptnr.ms / 60_000))} min`
  if (hours < 48) return `en ${hours} h`
  return `en ${Math.round(hours / 24)} días`
}

function buildUncertainty(j: Judgment): string {
  const parts: string[] = []
  if (j.pointOfNoReturn.status === "UNKNOWN") parts.push(PTNR_UNKNOWN_NOTE)
  if (j.commitment.exposedValue == null) parts.push(NO_VALUE_NOTE)
  parts.push(TACIT_NOTE)
  return parts.join(" ")
}

function buildEvidence(j: Judgment, capacity: Capacity): Evidence {
  const c = j.commitment
  const observed: string[] = [
    `Compromiso: orden ${c.workOrderNumber}${c.company ? ` · ${c.company}` : ""} (${c.subject}).`,
    c.hasActiveAssignment
      ? `Asignada a ${c.technicianName ?? "un técnico sin nombre"}.`
      : "Sin técnico asignado.",
    c.slaDueAt ? `Plazo comprometido: ${formatDateTime(c.slaDueAt)}.` : "Sin plazo registrado.",
  ]
  if (c.scheduledEnd) observed.push(`Fin planificado: ${formatDateTime(c.scheduledEnd)}.`)

  const concluded =
    j.estado === "en_riesgo_accionable"
      ? j.trajectoryOvershoots
        ? "El fin planificado supera el plazo comprometido: bajo el plan actual el compromiso no se cumple, pero la ventana sigue abierta."
        : "El compromiso entró en la ventana final de su SLA: está en riesgo y la ventana sigue abierta."
      : "Compromiso fuera de la ventana accionable."

  const feasibility =
    capacity.available > 0
      ? `${capacity.available} de ${capacity.active} técnicos disponibles para intervenir.`
      : `Sin capacidad libre ahora (0 de ${capacity.active} técnicos disponibles).`

  const ifNothing =
    c.exposedValue != null
      ? `El compromiso se incumple en su plazo. Valor en riesgo registrado: ${formatCOP(c.exposedValue)}.`
      : "El compromiso se incumple en su plazo. Valor económico no registrado en el sistema."

  return {
    observed,
    concluded,
    uncertainty: buildUncertainty(j),
    proposedAction: INTERVENTION_SENTENCE[j.requiredIntervention],
    feasibility,
    ifNothing,
  }
}

export function toSupervisionItem(j: Judgment, capacity: Capacity): SupervisionItem {
  const c = j.commitment
  const who = c.company ? ` (${c.company})` : ""
  return {
    id: c.id,
    commitment: c.company ? `Orden ${c.workOrderNumber} · ${c.company}` : `Orden ${c.workOrderNumber}`,
    headline: `La orden ${c.workOrderNumber}${who} está en riesgo de incumplir su compromiso`,
    valueExposed: formatCOP(c.exposedValue),
    timeToPointOfNoReturn: formatWindow(j.pointOfNoReturn),
    reasonWord: j.reasonWord,
    recommendedAction: INTERVENTION_LABEL[j.requiredIntervention],
    evidenceLine: c.hasActiveAssignment
      ? `Asignada a ${c.technicianName ?? "un técnico"}; el plan actual no cierra a tiempo.`
      : "Sin técnico asignado y el plazo se acerca.",
    tone: j.tone,
    evidence: buildEvidence(j, capacity),
  }
}

/** Hero: el contrato `Decision` se deriva del ítem de mayor impacto. */
export function toDecision(item: SupervisionItem): Decision {
  return {
    headline: item.headline,
    valueExposed: item.valueExposed,
    timeToPointOfNoReturn: item.timeToPointOfNoReturn,
    recommendedAction: item.recommendedAction,
    evidenceLine: item.evidenceLine,
  }
}

export function toHealthSnapshot(f: HealthFigures): HealthSnapshot {
  return {
    protectedToday: formatCOP(f.protectedValue),
    exposedInWindow: formatCOP(f.exposedValue),
    lostToday: formatCOP(f.lostValue),
    capacity: `${f.available} de ${f.active} libres`,
    trend: f.trend,
    tone: f.tone,
  }
}
