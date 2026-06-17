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
}

export type PlanAutoDispatchInput = {
  tenantId: UUID
  caseId: UUID
  description: string
  /** Deadline SLA del caso (ISO) o null. */
  slaDueAt: string | null
  /** Catálogo de skills del tenant para mapear nombre → id. */
  availableSkills: { id: UUID; name: string }[]
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
  const snapshots = now
    ? await deps.candidates.listCandidates(input.tenantId, now.date, deps.horizonDays)
    : []

  const { chosen, discarded } = now
    ? selectDispatch(snapshots, {
        skillId: classification.skillId,
        minLevel: null,
        zoneId: null,
        durationMinutes: classification.estimatedDurationMinutes,
        fromDate: now.date,
        fromMinute: now.minute,
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
