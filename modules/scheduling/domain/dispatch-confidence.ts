/**
 * Dispatch Confidence (ADR-033) — función PURA y determinística que decide si el
 * despacho autónomo puede proceder. NO usa IA: combina la confianza de la
 * clasificación con señales operativas que provienen de los motores existentes
 * (elegibilidad, slot, SLA) y de la calidad del reporte.
 *
 * Resultado:
 *   - PROCEED  → asignar y notificar.
 *   - HOLD     → hay técnico + slot, pero baja confianza o reporte pobre: se
 *                propone y un humano confirma.
 *   - ESCALATE → falta una condición operativa dura (sin elegible / sin slot /
 *                riesgo SLA): va a la bandeja humana de Despacho.
 */

export type DispatchVerdict = "PROCEED" | "HOLD" | "ESCALATE"

export type DispatchConfidenceInput = {
  /** 0..1 — confianza de la clasificación IA. */
  classificationConfidence: number
  /** Umbral mínimo de confianza del tenant (default sugerido 0.7). */
  confidenceThreshold: number
  /**
   * ¿La clasificación resolvió una skill REAL del tenant? Falso si no hubo
   * coincidencia o si hubo empate ambiguo. Bloqueo duro: el despacho autónomo
   * nunca asigna sin una skill del tenant identificada (preferimos falsos
   * negativos). Ver ADR-033 / clasificación tenant-aware.
   */
  hasSkill: boolean
  /** ¿El selector encontró al menos un técnico elegible? */
  hasEligibleTechnician: boolean
  /** ¿El técnico #1 pasa el tope de capacidad del día? */
  hasCapacity: boolean
  /** ¿Se encontró un slot válido? */
  hasSlot: boolean
  /** ¿El slot termina dentro del SLA? (true si no hay SLA). */
  slaOk: boolean
  /** ¿El reporte trae descripción y (foto o ubicación)? */
  reportQualityOk: boolean
}

export type DispatchConfidenceResult = {
  verdict: DispatchVerdict
  /** 0..1 — mezcla legible para mostrar al supervisor. */
  score: number
  /** Señales que bloquean PROCEED (claves estables, para auditoría/UI). */
  blockers: string[]
}

/** Bloqueos operativos duros → ESCALATE (bandeja humana). */
function hardBlockers(input: DispatchConfidenceInput): string[] {
  const b: string[] = []
  if (!input.hasSkill) b.push("no_skill_identified")
  if (!input.hasEligibleTechnician) b.push("no_eligible_technician")
  if (!input.hasSlot) b.push("no_slot")
  if (!input.slaOk) b.push("sla_risk")
  if (!input.hasCapacity) b.push("no_capacity")
  return b
}

/** Bloqueos blandos → HOLD (propone, humano confirma). */
function softBlockers(input: DispatchConfidenceInput): string[] {
  const b: string[] = []
  if (input.classificationConfidence < input.confidenceThreshold) {
    b.push("low_classification_confidence")
  }
  if (!input.reportQualityOk) b.push("poor_report_quality")
  return b
}

export function evaluateDispatchConfidence(
  input: DispatchConfidenceInput,
): DispatchConfidenceResult {
  const hard = hardBlockers(input)
  const soft = softBlockers(input)

  // Score legible: confianza de clasificación ponderada por señales operativas.
  const operationalOk =
    [input.hasEligibleTechnician, input.hasCapacity, input.hasSlot, input.slaOk].filter(
      Boolean,
    ).length / 4
  const qualityOk = input.reportQualityOk ? 1 : 0.5
  const score =
    Math.round(
      Math.min(1, input.classificationConfidence) * operationalOk * qualityOk * 100,
    ) / 100

  if (hard.length > 0) return { verdict: "ESCALATE", score, blockers: hard }
  if (soft.length > 0) return { verdict: "HOLD", score, blockers: soft }
  return { verdict: "PROCEED", score, blockers: [] }
}
