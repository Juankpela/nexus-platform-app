import type { DispatchCandidateReader } from "@/modules/scheduling/application/ports/dispatch-candidate-reader"
import type { ReportClassifier } from "@/modules/scheduling/application/ports/report-classifier"
import {
  evaluateDispatchConfidence,
  type DispatchConfidenceResult,
} from "@/modules/scheduling/domain/dispatch-confidence"
import {
  selectDispatch,
  type DispatchCandidate,
} from "@/modules/scheduling/domain/dispatch-selection"
import { localDateMinute, localSlotToIso } from "@/modules/scheduling/domain/local-time"
import type { ReportClassification } from "@/modules/scheduling/application/ports/report-classifier"
import type { UUID } from "@/types/shared"

/**
 * Planifica (NO escribe, NO notifica, NO crea efectos) un despacho autónomo
 * (ADR-033). Sigue el patrón de `plan-reschedule.ts`: clasifica → arma el
 * requerimiento → selecciona técnico+slot con el dominio puro → evalúa Dispatch
 * Confidence. Devuelve un plan que el caller aplica con los use-cases existentes.
 */

export type PlanAutoDispatchDeps = {
  classifier: ReportClassifier
  candidates: DispatchCandidateReader
  nowMs: number
  timeZone: string
  horizonDays: number
  /** Umbral de confianza del tenant (default sugerido 0.7). */
  confidenceThreshold: number
  /**
   * Coordinación, no "ahora": minutos de margen (preparación/desplazamiento) que
   * se suman al instante de entrada antes de buscar slot. Default 0 (sin margen).
   */
  leadMinutes?: number
  /**
   * Redondeo del inicio al siguiente múltiplo (ej. 30 = medias horas), para que
   * la hora propuesta sea un horario coordinado y no el minuto exacto de entrada.
   * Default 0 (sin redondeo).
   */
  slotGranularityMinutes?: number
}

/** Suma días a una fecha local YYYY-MM-DD (sin matemática de zona horaria). */
function addLocalDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`
}

/**
 * Punto de partida "coordinado" para la búsqueda de slot. En vez de arrancar en
 * el minuto exacto de entrada del caso (lo que haría que la hora propuesta luzca
 * igual a la creación), suma un lead mínimo y redondea al siguiente múltiplo. Si
 * el resultado cruza la medianoche, avanza al día siguiente. Pura, sin I/O.
 */
export function coordinatedStart(
  date: string,
  minute: number,
  leadMinutes: number,
  granularityMinutes: number,
): { fromDate: string; fromMinute: number } {
  let m = minute + Math.max(0, leadMinutes)
  if (granularityMinutes > 0) m = Math.ceil(m / granularityMinutes) * granularityMinutes
  let d = date
  while (m >= 1440) {
    m -= 1440
    d = addLocalDays(d, 1)
  }
  return { fromDate: d, fromMinute: m }
}

export type PlanAutoDispatchInput = {
  tenantId: UUID
  caseId: UUID
  description: string
  /** Deadline SLA del caso (ISO) o null. */
  slaDueAt: string | null
  /** Catálogo de skills del tenant (nombre + vocabulario propio) para mapear → id. */
  availableSkills: { id: UUID; name: string; aliases?: string[] }[]
}

export type AutoDispatchPlan = {
  verdict: DispatchConfidenceResult["verdict"]
  confidence: DispatchConfidenceResult
  classification: ReportClassification
  chosen: DispatchCandidate | null
  discarded: DispatchCandidate[]
  /** Ventana UTC del slot elegido (solo si hay técnico+slot). */
  startsAt: string | null
  endsAt: string | null
}

export async function planAutoDispatch(
  deps: PlanAutoDispatchDeps,
  input: PlanAutoDispatchInput,
): Promise<AutoDispatchPlan> {
  const classification = await deps.classifier.classify({
    tenantId: input.tenantId,
    text: input.description,
    availableSkills: input.availableSkills,
  })

  const now = localDateMinute(new Date(deps.nowMs).toISOString(), deps.timeZone)
  // Coordinación, no "ahora": el slot se busca desde un inicio coordinado
  // (lead + redondeo), no desde el minuto exacto de entrada del caso.
  const start = now
    ? coordinatedStart(
        now.date,
        now.minute,
        deps.leadMinutes ?? 0,
        deps.slotGranularityMinutes ?? 0,
      )
    : null
  const snapshots = now
    ? await deps.candidates.listCandidates(input.tenantId, now.date, deps.horizonDays)
    : []

  const { chosen, discarded } = start
    ? selectDispatch(snapshots, {
        skillId: classification.skillId,
        minLevel: null,
        zoneId: null,
        durationMinutes: classification.estimatedDurationMinutes,
        fromDate: start.fromDate,
        fromMinute: start.fromMinute,
        horizonDays: deps.horizonDays,
      })
    : { chosen: null, discarded: [] }

  const startsAt =
    chosen?.slot != null
      ? localSlotToIso(chosen.slot.date, chosen.slot.startMinute, deps.timeZone)
      : null
  const endsAt =
    chosen?.slot != null
      ? localSlotToIso(chosen.slot.date, chosen.slot.endMinute, deps.timeZone)
      : null

  const slaOk =
    input.slaDueAt == null || (endsAt != null && endsAt <= input.slaDueAt)

  const confidence = evaluateDispatchConfidence({
    classificationConfidence: classification.confidence,
    confidenceThreshold: deps.confidenceThreshold,
    // Bloqueo duro: sin una skill REAL del tenant identificada no se asigna.
    hasSkill: classification.skillId != null,
    hasEligibleTechnician: chosen != null,
    hasCapacity: chosen?.reasons.capacity ?? false,
    hasSlot: chosen?.slot != null,
    slaOk,
    reportQualityOk: input.description.trim().length >= 15,
  })

  return {
    verdict: confidence.verdict,
    confidence,
    classification,
    chosen,
    discarded,
    startsAt,
    endsAt,
  }
}
