import type { DispatchStats } from "@/modules/dispatch/domain/dispatch-stats"
import type { Judgment } from "./judge"

/**
 * Cifras de salud operacional (puro). Solo la CAPACIDAD tiene fuente real
 * (`DispatchStats`). El valor protegido/perdido y la tendencia NO tienen fuente
 * de datos → se devuelven `null`/`"flat"` y la UI muestra "—" (vía formatCOP).
 * Nunca se inventan. Ver docs/engineering/READ_MODEL_DATA_GAPS.md.
 */
export type HealthFigures = {
  /** GAP: no existe ledger de valor protegido. */
  protectedValue: number | null
  /** Suma del valor expuesto SOLO si TODOS los accionables tienen valor; si no, null (no parcial engañoso). */
  exposedValue: number | null
  /** GAP: no existe seguimiento de valor perdido. */
  lostValue: number | null
  available: number
  active: number
  /** GAP: no hay serie temporal del valor expuesto. */
  trend: "up" | "down" | "flat"
  tone: "calm" | "tension"
}

export function buildHealth(actionable: Judgment[], capacity: DispatchStats): HealthFigures {
  // Un total solo es honesto si es TOTAL: si algún accionable carece de valor,
  // la suma es desconocida (no un parcial que aparente completitud).
  const allValued =
    actionable.length > 0 && actionable.every((j) => j.commitment.exposedValue != null)
  const exposedValue = allValued
    ? actionable.reduce((sum, j) => sum + (j.commitment.exposedValue ?? 0), 0)
    : null

  return {
    protectedValue: null,
    exposedValue,
    lostValue: null,
    available: capacity.availableTechnicians,
    active: capacity.activeTechnicians,
    trend: "flat",
    tone: actionable.length > 0 ? "tension" : "calm",
  }
}
