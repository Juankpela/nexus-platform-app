import { isOpenStatus } from "./commitment"
import type { Judgment } from "./judge"

/**
 * Priorización pura. El blueprint pide ordenar por impacto = valor × urgencia ×
 * accionabilidad. Como el valor económico casi nunca existe (ver gaps), el orden
 * es VALOR-cuando-se-conoce, luego URGENCIA, luego id (estable y determinístico).
 * No inventa valor para rankear.
 */
export type Prioritized = {
  actionable: Judgment[]
  belowThresholdCount: number
}

export function prioritize(judgments: Judgment[]): Prioritized {
  const actionable = judgments
    .filter((j) => j.estado === "en_riesgo_accionable")
    .slice()
    .sort(compareByImpact)

  // Bajo umbral: compromisos abiertos en buen estado (no accionables, no perdidos).
  const belowThresholdCount = judgments.filter(
    (j) => isOpenStatus(j.commitment.status) && j.estado === "sano",
  ).length

  return { actionable, belowThresholdCount }
}

function compareByImpact(a: Judgment, b: Judgment): number {
  const av = a.commitment.exposedValue
  const bv = b.commitment.exposedValue
  // Valor conocido primero; entre conocidos, mayor valor primero.
  if (av != null && bv != null && av !== bv) return bv - av
  if (av != null && bv == null) return -1
  if (av == null && bv != null) return 1
  // Urgencia: ventana que cierra antes primero.
  const au = a.msToSlaDue ?? Number.POSITIVE_INFINITY
  const bu = b.msToSlaDue ?? Number.POSITIVE_INFINITY
  if (au !== bu) return au - bu
  // Desempate estable (determinismo).
  return a.commitment.id < b.commitment.id ? -1 : a.commitment.id > b.commitment.id ? 1 : 0
}
