import type { CasePriority } from "@/modules/service/domain/case"
import type { UUID } from "@/types/shared"

/**
 * Seam de clasificación (ADR-033). La IA SOLO transforma lenguaje natural del
 * reporte en datos operativos estructurados — no selecciona técnico, no agenda,
 * no decide nada operativo. Implementaciones: una con Anthropic (producción) y
 * una determinística por palabras clave (tests / fallback sin IA).
 */

export type ReportClassification = {
  /** Skill mapeada contra el catálogo del tenant; null si no se reconoció. */
  skillId: UUID | null
  /** Nombre devuelto por el clasificador (para auditoría/diagnóstico). */
  skillLabel: string | null
  priority: CasePriority
  estimatedDurationMinutes: number
  /** 0..1 — qué tan seguro está el clasificador. */
  confidence: number
}

export type ClassifyReportInput = {
  tenantId: UUID
  /** Texto del reporte (descripción del cliente). */
  text: string
  /** Catálogo de skills del tenant para mapear nombre → id. */
  availableSkills: { id: UUID; name: string }[]
}

export interface ReportClassifier {
  classify(input: ClassifyReportInput): Promise<ReportClassification>
}
