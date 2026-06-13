import { describe, expect, it } from "vitest"

import {
  buildRescheduleProposal,
  type RescheduleCandidate,
} from "@/modules/scheduling/domain/reschedule-proposal"
import type { WeeklyWindow } from "@/modules/service/domain/availability"

const MON = (s: number, e: number): WeeklyWindow => ({
  id: "w", weekday: 1, startMinute: s, endMinute: e, createdAt: "", updatedAt: "",
})

function candidate(over: Partial<RescheduleCandidate> = {}): RescheduleCandidate {
  return {
    workOrderId: "wo-1",
    workOrderNumber: "WO-1",
    assignmentId: "a-1",
    technicianId: "tech-1",
    technicianName: "Daniel",
    nonCompletionReason: "customer_absent",
    disposition: "reschedulable",
    durationMinutes: 120,
    windows: [MON(480, 1020)],
    exceptions: [],
    busy: [],
    ...over,
  }
}

const OPTS = { fromDate: "2026-06-15", fromMinute: 0, horizonDays: 14 } // Monday

describe("buildRescheduleProposal", () => {
  it("proposes a next slot for the same technician when reschedulable", () => {
    const p = buildRescheduleProposal(candidate(), OPTS)
    expect(p.outcome).toBe("reschedule")
    expect(p.technicianId).toBe("tech-1")
    expect(p.slot).toEqual({ date: "2026-06-15", weekday: 1, startMinute: 480, endMinute: 600 })
  })

  it("flags reassignable for a human (no auto-pick without WO skill reqs)", () => {
    const p = buildRescheduleProposal(
      candidate({ disposition: "reassignable", nonCompletionReason: "missing_skill" }),
      OPTS,
    )
    expect(p.outcome).toBe("reassign_needs_human")
    expect(p.slot).toBeNull()
    expect(p.technicianId).toBeNull()
  })

  it("reports no_slot when reschedulable but nothing fits the horizon", () => {
    const p = buildRescheduleProposal(candidate({ windows: [] }), OPTS)
    expect(p.outcome).toBe("no_slot")
  })

  it("never auto-acts on blocked/terminal dispositions", () => {
    expect(buildRescheduleProposal(candidate({ disposition: "blocked_hold" }), OPTS).outcome).toBe("no_action")
    expect(buildRescheduleProposal(candidate({ disposition: "terminal_no_action" }), OPTS).outcome).toBe("no_action")
  })
})
