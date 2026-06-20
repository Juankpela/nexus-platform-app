import type { EligibilityReasons } from "@/modules/scheduling/domain/eligibility"
import { SKILL_LEVEL_LABELS, type SkillLevel } from "@/modules/service/domain/skill"

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

// ── Explicabilidad ejecutiva (Fase Explicabilidad) ───────────────────────────
//
// Justifica una DECISIÓN DE NEGOCIO para un gerente operativo: por qué este
// técnico y por qué no los otros. Función PURA y determinística — el texto sale
// únicamente de los datos que el motor ya calculó (elegibilidad, nivel, slot,
// carga). Sin scores, sin %, sin lenguaje del algoritmo.

/** Candidato resuelto por el motor, con lo mínimo para explicar la decisión. */
export type ExplainCandidate = {
  name: string
  /** Nivel del técnico en la skill requerida (null si no la tiene). */
  level: SkillLevel | null
  reasons: EligibilityReasons
  /** Clave comparable del slot: menor = más temprano; null = sin horario. */
  slotKey: number | null
  dayAssignmentCount: number
  /** Rango del nivel (4=experto … 1=junior; 0=n/a). */
  skillRank: number
}

export type DispatchExplanationInput = {
  skillLabel: string | null
  /** Horario legible ya formateado (ej. "hoy, 3:30 p.m."). */
  whenText: string
  /** ¿El horario cae dentro del SLA comprometido? */
  slaOk: boolean
  chosen: ExplainCandidate
  discarded: ExplainCandidate[]
}

export type DispatchExplanation = {
  selected: {
    name: string
    skillLabel: string
    level: string | null
    /** Motivos en lenguaje de negocio (viñetas). */
    motives: string[]
  }
  discarded: {
    name: string
    skillLabel: string
    level: string | null
    /** Por qué se descartó, en lenguaje de negocio. */
    reason: string
  }[]
}

function levelLabel(level: SkillLevel | null): string | null {
  return level ? SKILL_LEVEL_LABELS[level] : null
}

/** Motivo de descarte de UN técnico, comparado contra el seleccionado. */
function discardReason(
  d: ExplainCandidate,
  chosen: ExplainCandidate,
  chosenName: string,
): string {
  // 1) Bloqueos duros (no era elegible) — prioridad de claridad.
  if (!d.reasons.status) return "No está activo en este momento."
  if (!d.reasons.skill) return "No tiene la especialidad requerida."
  if (!d.reasons.zone) return "No cubre la zona de la solicitud."
  if (!d.reasons.availability || !d.reasons.noOverlap || d.slotKey === null)
    return "No tiene un horario libre para esta visita."
  if (!d.reasons.capacity) return "Ya completó su cupo de trabajos del día."

  // 2) Era elegible pero perdió el desempate (mismo orden que el motor).
  if (chosen.slotKey !== null && d.slotKey > chosen.slotKey)
    return `${chosenName} puede atender antes.`
  if (d.dayAssignmentCount > chosen.dayAssignmentCount)
    return "Tiene más trabajos hoy; se prefirió equilibrar la carga."
  if (d.skillRank < chosen.skillRank)
    return "Existe una alternativa con mayor nivel técnico."
  return "Se prefirió al técnico seleccionado por orden de coordinación."
}

export function buildDispatchExplanation(
  input: DispatchExplanationInput,
): DispatchExplanation {
  const skill = input.skillLabel ?? "el servicio"
  const r = input.chosen.reasons

  const motives: string[] = []
  if (r.skill) motives.push(`Tiene la especialidad de ${skill}`)
  const lvl = levelLabel(input.chosen.level)
  if (lvl) motives.push(`Nivel ${lvl} en ${skill}`)
  if (r.availability) motives.push(`Está disponible ${input.whenText}`)
  if (input.slaOk) motives.push("Atiende dentro del tiempo comprometido con el cliente")
  if (r.capacity) motives.push("Tiene cupo en su agenda hoy")

  return {
    selected: {
      name: input.chosen.name,
      skillLabel: skill,
      level: lvl,
      motives,
    },
    discarded: input.discarded.map((d) => ({
      name: d.name,
      skillLabel: skill,
      level: levelLabel(d.level),
      reason: discardReason(d, input.chosen, input.chosen.name),
    })),
  }
}
