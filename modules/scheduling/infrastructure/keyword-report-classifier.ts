import type {
  ClassifyReportInput,
  ReportClassification,
  ReportClassifier,
} from "@/modules/scheduling/application/ports/report-classifier"

/**
 * Clasificador determinístico TENANT-AWARE (ADR-033, Hito B). NO contiene
 * categorías de negocio: reconoce skills puntuando el texto contra el catálogo
 * del tenant — su NOMBRE y su VOCABULARIO propio (`aliases`). El mismo código
 * sirve para cualquier tenant sin modificarse.
 *
 * Una skill es candidata si:
 *   - el NOMBRE coincide con cobertura ≥ 0.5 (umbral de Hito A, sin regresión), o
 *   - algún ALIAS del tenant coincide por completo.
 *
 * Reglas (preferimos falsos negativos):
 *   - 0 candidatas  → ESCALATE.
 *   - >1 candidatas → ESCALATE (ambiguo).
 *   - exactamente 1 → esa skill del tenant.
 *
 * Sin IA, sin LLM, sin APIs, sin catálogo global.
 */

const STOPWORDS = new Set([
  "senior", "junior", "general", "para", "con", "los", "las", "del", "una", "uno", "que",
])

const DIACRITICS = /[̀-ͯ]/g

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Tokens significativos del NOMBRE de skill / del reporte (≥4, sin stopwords). */
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * ¿Un alias del tenant está presente "por completo"? Alias multi-palabra con
 * tokens ≥4 → todos sus tokens deben aparecer (prefijo). Alias corto (p.ej.
 * "luz", "red", "gas") → coincidencia por palabra exacta en el texto normalizado.
 */
function aliasMatches(aliasRaw: string, reportNorm: string, reportTokens: string[]): boolean {
  const aliasNorm = normalize(aliasRaw)
  if (!aliasNorm) return false
  const aliasTokens = aliasNorm.split(" ").filter((t) => t.length >= 4 && !STOPWORDS.has(t))
  if (aliasTokens.length > 0) {
    return aliasTokens.every((at) => reportTokens.some((rt) => tokenMatches(at, rt)))
  }
  // Alias corto: palabra exacta (con frontera) en el texto normalizado.
  return new RegExp(`(^| )${escapeRegExp(aliasNorm)}( |$)`).test(reportNorm)
}

const MIN_NAME_COVERAGE = 0.5

type Candidate = {
  skill: { id: string; name: string }
  strength: number
  matchedTerm: string
}

export class KeywordReportClassifier implements ReportClassifier {
  constructor(
    private readonly defaultDurationMinutes = 60,
    private readonly defaultPriority: ReportClassification["priority"] = "medium",
  ) {}

  async classify(input: ClassifyReportInput): Promise<ReportClassification> {
    const reportNorm = normalize(input.text)
    const reportTokens = tokenize(input.text)

    const escalate: ReportClassification = {
      skillId: null,
      skillLabel: null,
      priority: this.defaultPriority,
      estimatedDurationMinutes: this.defaultDurationMinutes,
      confidence: 0,
      matchedTerm: null,
    }
    if (reportTokens.length === 0) return escalate

    const candidates: Candidate[] = []
    for (const skill of input.availableSkills) {
      // 1) Coincidencia por NOMBRE (umbral de Hito A).
      const nameTokens = tokenize(skill.name)
      const nameMatched = nameTokens.filter((nt) =>
        reportTokens.some((rt) => tokenMatches(nt, rt)),
      ).length
      const nameCov = nameTokens.length > 0 ? nameMatched / nameTokens.length : 0

      // 2) Coincidencia por ALIAS propio del tenant.
      const aliasHit = (skill.aliases ?? []).find((a) =>
        aliasMatches(a, reportNorm, reportTokens),
      )

      if (nameCov >= MIN_NAME_COVERAGE || aliasHit) {
        candidates.push({
          skill,
          strength: aliasHit ? 1 : nameCov,
          matchedTerm: aliasHit ?? skill.name,
        })
      }
    }

    // 0 o >1 candidatas → ambiguo / sin evidencia → ESCALATE.
    if (candidates.length !== 1) return escalate

    const winner = candidates[0]
    return {
      skillId: winner.skill.id,
      skillLabel: winner.skill.name,
      priority: this.defaultPriority,
      estimatedDurationMinutes: this.defaultDurationMinutes,
      confidence: Math.min(0.95, 0.6 + 0.35 * winner.strength),
      matchedTerm: winner.matchedTerm,
    }
  }
}
