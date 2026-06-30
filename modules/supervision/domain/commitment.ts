import type { CasePriority } from "@/modules/service/domain/case"

/**
 * Read Model de la Estación de Supervisión — DOMINIO PURO.
 *
 * El Read Model NO piensa, NO decide, NO recomienda, NO inventa: interpreta el
 * estado operacional EXISTENTE de forma determinística (mismo estado + mismo
 * `now` ⇒ misma salida). Donde falta un dato, se propaga incertidumbre; jamás
 * se fabrica. Ninguna función de este módulo depende de React ni de componentes.
 */

/**
 * Tipo de intervención que el estado observable EXIGE (no una recomendación).
 * El Read Model clasifica la categoría; la persona/momento/estrategia pertenecen
 * a capas superiores (Wizard-of-Oz / supervisor / futuro motor de decisión).
 *
 * Nota de contrato: el campo congelado de la UI se llama `recommendedAction`.
 * El nombre correcto del dominio es `requiredIntervention` / `InterventionType`.
 * El adaptador traduce este enum a la etiqueta que la UI ya muestra. Ver
 * docs/engineering/READ_MODEL_DATA_GAPS.md (rename recomendado al descongelar).
 */
export type InterventionType =
  | "ASSIGN_TECHNICIAN"
  | "RESCHEDULE"
  | "FOLLOW_UP_CUSTOMER"
  | "ESCALATE_PARTS"
  | "REVIEW"

/**
 * Compromiso normalizado: la entrada pura del pipeline. Todo son primitivos ya
 * extraídos del estado real (no hay entidad "compromiso" en la BD: se deriva de
 * una WorkOrder con plazo SLA). `null` = dato inexistente (no se sustituye).
 */
export type RawCommitment = {
  id: string
  workOrderNumber: string
  company: string | null
  subject: string
  priority: CasePriority
  status: string
  /** Plazo comprometido (SLA). Sin él, el compromiso no es supervisable. */
  slaDueAt: string | null
  /** Fin planificado (de la asignación activa o de la orden). */
  scheduledEnd: string | null
  /** Cierre real (actualEnd), si ya se resolvió. */
  resolvedAt: string | null
  hasActiveAssignment: boolean
  technicianName: string | null
  /** Duración estimada (solo existe vía asignación activa). Sin ella el punto de no retorno NO es computable. */
  estimatedDurationMinutes: number | null
  /** Valor económico real: SOLO si hay factura emitida ligada a la orden. `null` = no registrado. */
  exposedValue: number | null
}

const TERMINAL = new Set(["completed", "cancelled"])

/** Una orden está "abierta" (viva) si no está en un estado terminal. */
export function isOpenStatus(status: string): boolean {
  return !TERMINAL.has(status)
}
