import { describe, expect, it } from "vitest"

import {
  linkDecisionsToOutcomes,
  type DecisionRecord,
  type ExecutionRecord,
} from "@/modules/scheduling/domain/outcome-linkage"

const NOW = new Date("2026-06-28T12:00:00.000Z")

function execMap(records: ExecutionRecord[]): Map<string, ExecutionRecord> {
  return new Map(records.map((r) => [r.workOrderId, r]))
}

describe("linkDecisionsToOutcomes (Outcome Linkage / C4)", () => {
  it("closes the loop and computes decision accuracy, override and coverage", () => {
    const decisions: DecisionRecord[] = [
      // D1 — acted, completed on time by the recommended tech → met + followed
      { caseId: "c1", decidedAt: NOW.toISOString(), verdict: "PROCEED", forced: false, recommendedTechnicianId: "techA", workOrderId: "wo1" },
      // D2 — acted, completed LATE by a DIFFERENT tech → breached + overridden
      { caseId: "c2", decidedAt: NOW.toISOString(), verdict: "PROCEED", forced: false, recommendedTechnicianId: "techB", workOrderId: "wo2" },
      // D3 — system deferred to a human (HOLD, no work order) → not_acted
      { caseId: "c3", decidedAt: NOW.toISOString(), verdict: "HOLD", forced: false, recommendedTechnicianId: "techA", workOrderId: null },
      // D4 — acted (forced), technician could not complete → unable
      { caseId: "c4", decidedAt: NOW.toISOString(), verdict: "ESCALATE", forced: true, recommendedTechnicianId: "techA", workOrderId: "wo3" },
      // D5 — acted, but no execution row yet → linked=false, open (loop not closed)
      { caseId: "c5", decidedAt: NOW.toISOString(), verdict: "PROCEED", forced: false, recommendedTechnicianId: "techA", workOrderId: "wo4" },
    ]

    const executions = execMap([
      { workOrderId: "wo1", technicianId: "techA", status: "completed", completedAt: "2026-06-28T09:00:00.000Z", slaDueAt: "2026-06-28T10:00:00.000Z", priority: "high" },
      { workOrderId: "wo2", technicianId: "techC", status: "completed", completedAt: "2026-06-28T11:00:00.000Z", slaDueAt: "2026-06-28T08:00:00.000Z", priority: "high" },
      { workOrderId: "wo3", technicianId: "techA", status: "unable_to_complete", completedAt: null, slaDueAt: "2026-06-28T20:00:00.000Z", priority: "medium" },
      // wo4 intentionally absent
    ])

    const { rows, summary } = linkDecisionsToOutcomes(decisions, executions, NOW)

    expect(rows[0]).toMatchObject({ acted: true, linked: true, outcome: "completed", slaStatus: "met", recommendationFollowed: true })
    expect(rows[1]).toMatchObject({ acted: true, linked: true, outcome: "completed", slaStatus: "breached", recommendationFollowed: false })
    expect(rows[2]).toMatchObject({ acted: false, linked: false, outcome: "not_acted", slaStatus: null })
    expect(rows[3]).toMatchObject({ acted: true, linked: true, outcome: "unable" })
    expect(rows[4]).toMatchObject({ acted: true, linked: false, outcome: "open", slaStatus: null })

    expect(summary).toMatchObject({
      totalDecisions: 5,
      actedDecisions: 4,
      deferredDecisions: 1,
      linkedDecisions: 3,
      completed: 2,
      withinSla: 1,
      breachedSla: 1,
      stillOpen: 1,
      // D1 + D4: recommended tech (techA) actually executed — "followed" is
      // independent of the outcome (D4 was forced and ended unable, but techA went).
      followedRecommendation: 2,
      overridden: 1,
      decisionAccuracyPct: 50, // 1 of 2 resolved decisions met SLA
      linkageCoveragePct: 75, // 3 of 4 acted decisions linked to an execution
    })
  })

  it("returns null rates (not 0) when there is nothing to measure yet", () => {
    const { summary } = linkDecisionsToOutcomes([], new Map(), NOW)
    expect(summary.decisionAccuracyPct).toBeNull()
    expect(summary.linkageCoveragePct).toBeNull()
    expect(summary.totalDecisions).toBe(0)
  })
})
