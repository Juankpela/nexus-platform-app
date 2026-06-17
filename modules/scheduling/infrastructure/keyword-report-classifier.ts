import type {
  ClassifyReportInput,
  ReportClassification,
  ReportClassifier,
} from "@/modules/scheduling/application/ports/report-classifier"

/**
 * Clasificador determinístico TENANT-AWARE (ADR-033). NO contiene categorías de
 * negocio: puntúa el texto del reporte EXCLUSIVAMENTE contra el catálogo de
 * skills del tenant (`input.availableSkills`). El mismo código sirve para
 * cualquier tenant (HVAC, Ascensores, Paneles Solares, …) sin modificarse.
 *
 * Reglas (preferimos falsos negativos):
 *  - Sin coincidencia        → ESCALATE (skillId null, confidence 0).
 *  - Empate de mejor puntaje → ESCALATE (ambiguo).
 *  - Cobertura insuficiente  → ESCALATE.
 *  - Una única skill clara   → esa skill del tenant.
 *
 * Sin IA, sin LLM, sin APIs externas. Prioridad/duración son DEFAULTS neutrales
 * (inyectables), no derivados de categorías globales.
 */

const STOPWORDS = new Set([
  "senior", "junior", "general", "para", "con", "los", "las", "del", "una", "uno", "que",
])

const DIACRITICS = /[̀-ͯ]/g

/** lowercase + sin diacríticos + solo alfanumérico separado por espacios. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Tokens significativos (≥4 chars, sin stopwords/calificadores de nivel). */
function tokenize(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t))
}

/** Coincidencia por prefijo común (≥4) — tolera plural/género (solar↔solares). */
function tokenMatches(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length)
  if (n < 4) return false
  return a.slice(0, n) === b.slice(0, n)
}

/** Cobertura mínima de tokens de la skill para aceptar (preferir falsos negativos). */
const MIN_COVERAGE = 0.5

type ScoredSkill = {
  skill: { id: string; name: string }
  matched: number
  coverage: number
}

export class KeywordReportClassifier implements ReportClassifier {
  constructor(
    private readonly defaultDurationMinutes = 60,
    private readonly defaultPriority: ReportClassification["priority"] = "medium",
  ) {}

  async classify(input: ClassifyReportInput): Promise<ReportClassification> {
    const reportTokens = tokenize(input.text)

    const escalate: ReportClassification = {
      skillId: null,
      skillLabel: null,
      priority: this.defaultPriority,
      estimatedDurationMinutes: this.defaultDurationMinutes,
      confidence: 0,
    }
    if (reportTokens.length === 0) return escalate

    // Puntuar cada skill del tenant por tokens propios presentes en el reporte.
    const scored: ScoredSkill[] = input.availableSkills
      .map((skill) => {
        const skillTokens = tokenize(skill.name)
        if (skillTokens.length === 0) return null
        const matched = skillTokens.filter((st) =>
          reportTokens.some((rt) => tokenMatches(st, rt)),
        ).length
        return { skill, matched, coverage: matched / skillTokens.length }
      })
      .filter((s): s is ScoredSkill => s !== null && s.matched > 0)

    if (scored.length === 0) return escalate

    const bestScore = Math.max(...scored.map((s) => s.matched))
    const top = scored.filter((s) => s.matched === bestScore)

    // Empate de mejor puntaje → ambiguo → ESCALATE.
    if (top.length !== 1) return escalate

    const winner = top[0]
    // Evidencia insuficiente → ESCALATE.
    if (winner.coverage < MIN_COVERAGE) return escalate

    return {
      skillId: winner.skill.id,
      skillLabel: winner.skill.name,
      priority: this.defaultPriority,
      estimatedDurationMinutes: this.defaultDurationMinutes,
      // Confianza derivada de la cobertura (única skill clara → alta).
      confidence: Math.min(0.95, 0.6 + 0.35 * winner.coverage),
    }
  }
}
