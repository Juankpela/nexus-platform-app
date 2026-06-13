import { describe, expect, it } from "vitest"

import {
  classifyWorkOrderTiming,
  needsAttention,
  type WorkOrderTimingView,
} from "@/modules/scheduling/domain/overdue"

const NOW = Date.parse("2026-06-13T12:00:00.000Z")
const HOUR = 60 * 60 * 1000

function classify(view: WorkOrderTimingView, atRiskWindowMs?: number) {
  return classifyWorkOrderTiming(view, { nowMs: NOW, atRiskWindowMs })
}

const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

describe("classifyWorkOrderTiming", () => {
  it("treats terminal work orders as healthy regardless of deadlines", () => {
    for (const status of ["completed", "cancelled"]) {
      const t = classify({ status, scheduledEnd: iso(-5 * HOUR), slaDueAt: iso(-5 * HOUR) })
      expect(t).toEqual({ isOpen: false, scheduleSlipped: false, sla: "none", severity: "ok" })
    }
  })

  it("reports a clean open WO with future deadline as ok", () => {
    const t = classify({ status: "scheduled", scheduledEnd: iso(5 * HOUR), slaDueAt: iso(10 * HOUR) })
    expect(t).toEqual({ isOpen: true, scheduleSlipped: false, sla: "ok", severity: "ok" })
  })

  it("flags a breached SLA as critical", () => {
    const t = classify({ status: "in_progress", scheduledEnd: iso(2 * HOUR), slaDueAt: iso(-1 * HOUR) })
    expect(t.sla).toBe("breached")
    expect(t.severity).toBe("critical")
  })

  it("flags an SLA inside the at-risk window as warning", () => {
    const t = classify({ status: "scheduled", scheduledEnd: iso(3 * HOUR), slaDueAt: iso(1 * HOUR) })
    expect(t.sla).toBe("at_risk")
    expect(t.severity).toBe("warning")
  })

  it("treats an SLA just outside the at-risk window as ok", () => {
    const t = classify({ status: "scheduled", scheduledEnd: null, slaDueAt: iso(3 * HOUR) })
    expect(t.sla).toBe("ok")
    expect(t.severity).toBe("ok")
  })

  it("respects a custom at-risk window", () => {
    const view: WorkOrderTimingView = { status: "scheduled", scheduledEnd: null, slaDueAt: iso(3 * HOUR) }
    expect(classify(view, 4 * HOUR).sla).toBe("at_risk")
    expect(classify(view, 1 * HOUR).sla).toBe("ok")
  })

  it("detects a slipped schedule even without an SLA", () => {
    const t = classify({ status: "dispatched", scheduledEnd: iso(-3 * HOUR), slaDueAt: null })
    expect(t.scheduleSlipped).toBe(true)
    expect(t.sla).toBe("none")
    expect(t.severity).toBe("warning")
  })

  it("does not slip when the planned window is still in the future", () => {
    const t = classify({ status: "scheduled", scheduledEnd: iso(2 * HOUR), slaDueAt: null })
    expect(t.scheduleSlipped).toBe(false)
    expect(t.severity).toBe("ok")
  })

  it("a breached SLA outranks a mere schedule slip", () => {
    const t = classify({ status: "in_progress", scheduledEnd: iso(-4 * HOUR), slaDueAt: iso(-1 * HOUR) })
    expect(t.scheduleSlipped).toBe(true)
    expect(t.severity).toBe("critical")
  })

  it("ignores unparseable timestamps as absent", () => {
    const t = classify({ status: "scheduled", scheduledEnd: "not-a-date", slaDueAt: "nope" })
    expect(t).toEqual({ isOpen: true, scheduleSlipped: false, sla: "none", severity: "ok" })
  })

  it("needsAttention is true for anything above ok", () => {
    expect(needsAttention({ isOpen: true, scheduleSlipped: false, sla: "ok", severity: "ok" })).toBe(false)
    expect(needsAttention({ isOpen: true, scheduleSlipped: true, sla: "none", severity: "warning" })).toBe(true)
    expect(needsAttention({ isOpen: true, scheduleSlipped: false, sla: "breached", severity: "critical" })).toBe(true)
  })
})
