import type { CasePriority } from "@/modules/service/domain/case"
import { computeSlaStatus, type SlaStatus } from "@/modules/service/domain/sla"

/**
 * Outcome Linkage (Capability C4) — domain core.
 *
 * Closes the loop the architecture rests on: Decision → Action → Outcome.
 * Given the dispatch decisions NEXUS made (read back from the audit trail) and
 * the real-world result of each work order they produced, it links them and
 * answers the one question that turns an assistant into a platform: *did our
 * decisions turn out well?*
 *
 * Deliberately PURE and deterministic — no LLM, no I/O, no statistics. It is the
 * part of the architecture that survives any model swap by construction: the
 * corpus of (decision → outcome) pairs is model-agnostic. `now` is injected so
 * the function is fully testable.
 */

export type DispatchVerdict = "PROCEED" | "HOLD" | "ESCALATE"

/** A dispatch decision, as recorded in `autonomous_dispatch.assigned`. */
export type DecisionRecord = {
  caseId: string
  decidedAt: string
  verdict: DispatchVerdict
  /** A human forced the plan despite a non-PROCEED verdict. */
  forced: boolean
  /** Technician the system recommended (the baseline to compare against). */
  recommendedTechnicianId: string | null
  /** Set only when the system actually acted (created a work order). */
  workOrderId: string | null
}

/** The real-world result of the work order a decision produced. */
export type ExecutionRecord = {
  workOrderId: string
  /** Technician who actually executed (to detect human override of the recommendation). */
  technicianId: string | null
  /** work_order_executions.status */
  status: string
  completedAt: string | null
  slaDueAt: string | null
  priority: CasePriority | null
}

export type DecisionOutcomeKind = "completed" | "unable" | "open" | "not_acted"

export type DecisionOutcome = {
  caseId: string
  workOrderId: string | null
  decidedAt: string
  verdict: DispatchVerdict
  /** The system created a work order (PROCEED, or a human forced the plan). */
  acted: boolean
  /** An execution row was found — the loop physically closes for this decision. */
  linked: boolean
  outcome: DecisionOutcomeKind
  slaStatus: SlaStatus | null
  /** recommended technician === technician who executed (null if unknown). */
  recommendationFollowed: boolean | null
}

export type OutcomeSummary = {
  totalDecisions: number
  /** System created a work order. */
  actedDecisions: number
  /** System deferred to a human (HOLD/ESCALATE, no work order). */
  deferredDecisions: number
  /** Acted decisions we could tie to a real execution (loop closed). */
  linkedDecisions: number
  completed: number
  withinSla: number
  breachedSla: number
  stillOpen: number
  followedRecommendation: number
  overridden: number
  /** HEADLINE: of resolved (completed) acted decisions, the share that met SLA. */
  decisionAccuracyPct: number | null
  /** Health of the loop itself: of acted decisions, the share we could link. */
  linkageCoveragePct: number | null
}

const FALLBACK_PRIORITY: CasePriority = "medium"

function pct(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100)
}

export function linkDecisionsToOutcomes(
  decisions: readonly DecisionRecord[],
  executionsByWorkOrder: ReadonlyMap<string, ExecutionRecord>,
  now: Date,
): { rows: DecisionOutcome[]; summary: OutcomeSummary } {
  const rows: DecisionOutcome[] = decisions.map((d) => {
    if (d.workOrderId == null) {
      return {
        caseId: d.caseId,
        workOrderId: null,
        decidedAt: d.decidedAt,
        verdict: d.verdict,
        acted: false,
        linked: false,
        outcome: "not_acted",
        slaStatus: null,
        recommendationFollowed: null,
      }
    }

    const exec = executionsByWorkOrder.get(d.workOrderId)
    if (!exec) {
      // Acted, but no execution yet (assignment not started) or a data gap.
      return {
        caseId: d.caseId,
        workOrderId: d.workOrderId,
        decidedAt: d.decidedAt,
        verdict: d.verdict,
        acted: true,
        linked: false,
        outcome: "open",
        slaStatus: null,
        recommendationFollowed: null,
      }
    }

    const outcome: DecisionOutcomeKind =
      exec.status === "completed"
        ? "completed"
        : exec.status === "unable_to_complete"
          ? "unable"
          : "open"

    const slaStatus = computeSlaStatus({
      slaDueAt: exec.slaDueAt,
      priority: exec.priority ?? FALLBACK_PRIORITY,
      resolvedAt: outcome === "completed" ? exec.completedAt : null,
      closedAt: null,
      now,
    })

    const recommendationFollowed =
      d.recommendedTechnicianId != null && exec.technicianId != null
        ? d.recommendedTechnicianId === exec.technicianId
        : null

    return {
      caseId: d.caseId,
      workOrderId: d.workOrderId,
      decidedAt: d.decidedAt,
      verdict: d.verdict,
      acted: true,
      linked: true,
      outcome,
      slaStatus,
      recommendationFollowed,
    }
  })

  const acted = rows.filter((r) => r.acted)
  const completed = acted.filter((r) => r.outcome === "completed")
  const withinSla = completed.filter((r) => r.slaStatus === "met")
  const linked = acted.filter((r) => r.linked)

  return {
    rows,
    summary: {
      totalDecisions: rows.length,
      actedDecisions: acted.length,
      deferredDecisions: rows.length - acted.length,
      linkedDecisions: linked.length,
      completed: completed.length,
      withinSla: withinSla.length,
      breachedSla: acted.filter((r) => r.slaStatus === "breached").length,
      stillOpen: acted.filter((r) => r.outcome === "open").length,
      followedRecommendation: acted.filter((r) => r.recommendationFollowed === true).length,
      overridden: acted.filter((r) => r.recommendationFollowed === false).length,
      decisionAccuracyPct: pct(withinSla.length, completed.length),
      linkageCoveragePct: pct(linked.length, acted.length),
    },
  }
}
