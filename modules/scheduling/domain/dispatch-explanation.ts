import type { EligibilityReasons } from "@/modules/scheduling/domain/eligibility"

/**
 * Etiquetas humanas (es) para los criterios de elegibilidad (ADR-033, Hito C).
 * La explicación del despacho asistido se deriva ÚNICAMENTE de `EligibilityReasons`
 * generado por el motor — sin IA, sin texto inventado.
 */
export const ELIGIBILITY_REASON_LABELS: Record<keyof EligibilityReasons, string> = {
  status: "Técnico activo",
  skill: "Tiene la skill requerida",
  zone: "Cubre la zona",
  availability: "Disponible en el horario",
  capacity: "Capacidad disponible",
  noOverlap: "Sin conflictos de agenda",
}

const ORDER: (keyof EligibilityReasons)[] = [
  "skill",
  "availability",
  "capacity",
  "noOverlap",
  "zone",
  "status",
]

/** Criterios cumplidos (✓) en orden estable de presentación. */
export function passedReasons(reasons: EligibilityReasons): string[] {
  return ORDER.filter((k) => reasons[k]).map((k) => ELIGIBILITY_REASON_LABELS[k])
}

/** Criterios incumplidos (✗) — por qué se descartó el técnico. */
export function failedReasons(reasons: EligibilityReasons): string[] {
  return ORDER.filter((k) => !reasons[k]).map((k) => ELIGIBILITY_REASON_LABELS[k])
}

/** Primer motivo de descarte (para la línea compacta de la tarjeta). */
export function primaryFailure(reasons: EligibilityReasons): string | null {
  const first = ORDER.find((k) => !reasons[k])
  return first ? ELIGIBILITY_REASON_LABELS[first] : null
}
