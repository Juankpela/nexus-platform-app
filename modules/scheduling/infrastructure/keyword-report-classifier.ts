import type {
  ClassifyReportInput,
  ReportClassification,
  ReportClassifier,
} from "@/modules/scheduling/application/ports/report-classifier"

/**
 * Clasificador determinístico por palabras clave (ADR-033, Hito A). NO usa IA,
 * LLM, prompts ni APIs externas — su único fin es validar el MOTOR de despacho
 * con reglas explícitas y auditables. La implementación con Anthropic llegará en
 * el siguiente hito detrás del mismo puerto `ReportClassifier`.
 *
 * Mapea el texto a un nombre de skill canónico, luego a un `skillId` del catálogo
 * del tenant (match por nombre, case-insensitive). Si no reconoce skill o no
 * existe en el catálogo → confidence 0 (el gate de Dispatch Confidence escalará).
 */

type Rule = {
  skill: string // nombre canónico esperado en el catálogo del tenant
  durationMinutes: number
  priority: ReportClassification["priority"]
  keywords: string[]
}

// Reglas base (es/EN). El nombre de skill debe coincidir con el catálogo del tenant.
const RULES: Rule[] = [
  {
    skill: "HVAC",
    durationMinutes: 120,
    priority: "medium",
    keywords: ["aire acondicionado", "aire", "clima", "hvac", "refriger", "enfri", "calefacc"],
  },
  {
    skill: "Electrical",
    durationMinutes: 90,
    priority: "high",
    keywords: ["electric", "luz", "corto", "breaker", "tablero", "energía", "energia", "enchufe", "toma"],
  },
  {
    skill: "Plumbing",
    durationMinutes: 90,
    priority: "medium",
    keywords: ["plomer", "fuga", "agua", "tuber", "baño", "bano", "inodoro", "drenaje", "filtrac"],
  },
]

function normalize(text: string): string {
  return text.toLowerCase()
}

export class KeywordReportClassifier implements ReportClassifier {
  async classify(input: ClassifyReportInput): Promise<ReportClassification> {
    const text = normalize(input.text)
    const matched = RULES.find((r) => r.keywords.some((k) => text.includes(k)))

    if (!matched) {
      return {
        skillId: null,
        skillLabel: null,
        priority: "medium",
        estimatedDurationMinutes: 60,
        confidence: 0,
      }
    }

    const skill = input.availableSkills.find(
      (s) => s.name.trim().toLowerCase() === matched.skill.toLowerCase(),
    )

    return {
      skillId: skill?.id ?? null,
      skillLabel: matched.skill,
      priority: matched.priority,
      estimatedDurationMinutes: matched.durationMinutes,
      // Alta si la skill existe en el catálogo; baja si se reconoció el tema
      // pero el tenant no tiene esa skill configurada (el gate lo frena).
      confidence: skill ? 0.9 : 0.3,
    }
  }
}
