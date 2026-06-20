import type { UUID } from "@/types/shared"

/**
 * Récord de cumplimiento histórico de un técnico, agregado desde
 * work_order_executions (no es una tabla nueva). Es la materia prima para que la
 * coordinación pondere desempeño (outcome > tiempo) y para mostrar credibilidad.
 */
export type TechnicianOutcome = {
  technicianId: UUID
  /** Trabajos llevados a "completado". */
  completedCount: number
  /** Trabajos cerrados como "no se pudo completar". */
  unableCount: number
  /** Total de trabajos resueltos (completados + no completados). */
  resolvedCount: number
  /** Completados / resueltos (0..1). null si aún no resolvió nada. */
  successRate: number | null
  /** Minutos promedio en sitio (inicio → cierre) en completados. null si no aplica. */
  avgWorkMinutes: number | null
  /** Último cierre exitoso, ISO. null si nunca completó. */
  lastCompletedAt: string | null
}

/**
 * Récord de un técnico en UN tipo de daño específico. Materia prima de la
 * explicabilidad ("ha completado N trabajos de 'No enfría', X% de éxito") y del
 * desempate por experiencia del motor.
 */
export type TechnicianIssueTypeOutcome = {
  technicianId: UUID
  completedCount: number
  resolvedCount: number
  successRate: number | null
  lastCompletedAt: string | null
}

/** Umbral mínimo de trabajos resueltos para que la tasa de éxito sea representativa. */
export const OUTCOME_SAMPLE_THRESHOLD = 5

/** ¿Hay suficientes datos para que la tasa de éxito sea creíble como desempate? */
export function hasReliableOutcomes(outcome: TechnicianOutcome): boolean {
  return outcome.resolvedCount >= OUTCOME_SAMPLE_THRESHOLD
}
