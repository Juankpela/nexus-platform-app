import { describe, expect, it } from "vitest"

import {
  buildDailyDecisions,
  buildHeadline,
  MAX_VISIBLE_DECISIONS,
  type DailyDecisionsInput,
} from "@/modules/platform/application/daily-decisions"

const EMPTY: DailyDecisionsInput = {
  openBreachedCount: 0,
  proposals: [],
  exceptions: [],
  overloadedTechnicians: 0,
  receivable: null,
}

const PROPOSAL = {
  caseNumber: "CASE-0001",
  subject: "Aire acondicionado sin enfriar",
  technicianName: "Laura Gómez",
  scheduleLabel: "hoy 2:00 p.m.",
}

describe("buildDailyDecisions", () => {
  it("returns no decisions for a quiet operation", () => {
    const b = buildDailyDecisions(EMPTY)
    expect(b.decisions).toEqual([])
    expect(b.hiddenCount).toBe(0)
  })

  it("ranks SLA breaches first and money last, capping at the visible max", () => {
    const b = buildDailyDecisions({
      openBreachedCount: 2,
      proposals: [PROPOSAL],
      exceptions: [{ caseNumber: "CASE-0002", subject: "Fuga en tubería" }],
      overloadedTechnicians: 1,
      receivable: { total: 1_850_000, count: 3, oldestIssueAt: "2026-06-19T12:00:00Z" },
    })
    expect(b.decisions).toHaveLength(MAX_VISIBLE_DECISIONS)
    expect(b.decisions[0].id).toBe("sla-breached")
    expect(b.decisions[0].tone).toBe("critical")
    expect(b.hiddenCount).toBe(2)
  })

  it("names the technician and case when a signal is singular", () => {
    const b = buildDailyDecisions({ ...EMPTY, proposals: [PROPOSAL] })
    expect(b.decisions[0].title).toContain("Laura Gómez")
    expect(b.decisions[0].title).toContain(PROPOSAL.subject)
  })

  it("aggregates plural signals into one decision each", () => {
    const b = buildDailyDecisions({
      ...EMPTY,
      exceptions: [
        { caseNumber: "CASE-0002", subject: "Fuga" },
        { caseNumber: "CASE-0003", subject: "Corto" },
      ],
    })
    expect(b.decisions).toHaveLength(1)
    expect(b.decisions[0].title).toContain("2 solicitudes")
  })

  it("skips receivables when the viewer cannot see billing or nothing is owed", () => {
    expect(buildDailyDecisions({ ...EMPTY, receivable: null }).decisions).toEqual([])
    expect(
      buildDailyDecisions({ ...EMPTY, receivable: { total: 0, count: 0, oldestIssueAt: null } })
        .decisions,
    ).toEqual([])
  })

  it("computes the age of the oldest receivable from an injected clock", () => {
    const nowMs = new Date("2026-07-01T12:00:00Z").getTime()
    const b = buildDailyDecisions(
      { ...EMPTY, receivable: { total: 500_000, count: 1, oldestIssueAt: "2026-06-19T12:00:00Z" } },
      nowMs,
    )
    expect(b.decisions[0].detail).toContain("12 días")
  })
})

describe("buildHeadline", () => {
  it("celebrates calm when nothing is pending", () => {
    const b = buildDailyDecisions(EMPTY)
    expect(buildHeadline(b, { onboardingInProgress: false })).toBe(
      "Tu operación está sana. No hay decisiones pendientes.",
    )
  })

  it("points to activation for a tenant that has not operated yet", () => {
    const b = buildDailyDecisions(EMPTY)
    expect(buildHeadline(b, { onboardingInProgress: true })).toContain("primera decisión")
  })

  it("counts visible plus hidden decisions and handles singular", () => {
    const one = buildDailyDecisions({ ...EMPTY, openBreachedCount: 1 })
    expect(buildHeadline(one, { onboardingInProgress: false })).toBe(
      "Hoy hay 1 decisión que puede cambiar tu operación.",
    )
    const many = buildDailyDecisions({
      openBreachedCount: 1,
      proposals: [PROPOSAL],
      exceptions: [{ caseNumber: "C", subject: "s" }],
      overloadedTechnicians: 2,
      receivable: { total: 100, count: 1, oldestIssueAt: null },
    })
    expect(buildHeadline(many, { onboardingInProgress: false })).toBe(
      "Hoy hay 5 decisiones que pueden cambiar tu operación.",
    )
  })
})
