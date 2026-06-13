import { describe, expect, it } from "vitest"

import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { RescheduleCandidateReader } from "@/modules/scheduling/application/ports/reschedule-candidate-reader"
import {
  RESCHEDULE_PROPOSED_EVENT,
  proposeReschedulesForTenant,
  type ProposeReschedulesDeps,
} from "@/modules/scheduling/application/use-cases/propose-reschedules"
import type { RescheduleCandidate } from "@/modules/scheduling/domain/reschedule-proposal"
import type { WeeklyWindow } from "@/modules/service/domain/availability"

const TENANT = "11111111-1111-1111-1111-111111111111"
const MON = (s: number, e: number): WeeklyWindow => ({
  id: "w", weekday: 1, startMinute: s, endMinute: e, createdAt: "", updatedAt: "",
})

function candidate(over: Partial<RescheduleCandidate>): RescheduleCandidate {
  return {
    workOrderId: "wo",
    workOrderNumber: "WO",
    assignmentId: "a",
    technicianId: "t",
    technicianName: "T",
    nonCompletionReason: "customer_absent",
    disposition: "reschedulable",
    durationMinutes: 120,
    windows: [MON(480, 1020)],
    exceptions: [],
    busy: [],
    ...over,
  }
}

class FakeReader implements RescheduleCandidateReader {
  constructor(private readonly candidates: RescheduleCandidate[]) {}
  async listActionableCandidates() {
    return this.candidates
  }
}

class FakeAudit {
  events: AuditEvent[] = []
  async append(e: AuditEvent) {
    this.events.push(e)
  }
  async listBySubject() {
    return []
  }
}

function deps(reader: RescheduleCandidateReader, audit: FakeAudit): ProposeReschedulesDeps {
  return {
    reader,
    audit,
    nowMs: Date.parse("2026-06-15T12:00:00Z"), // Monday, 07:00 local Bogotá
    requestId: "req",
    timeZone: "America/Bogota",
    horizonDays: 14,
  }
}

describe("proposeReschedulesForTenant (dry-run)", () => {
  it("emits a reschedule proposal and writes nothing", async () => {
    const audit = new FakeAudit()
    const reader = new FakeReader([
      candidate({ workOrderId: "wo-1", disposition: "reschedulable" }),
      candidate({ workOrderId: "wo-2", disposition: "reassignable", nonCompletionReason: "missing_skill" }),
    ])
    const r = await proposeReschedulesForTenant(deps(reader, audit), TENANT)

    expect(r.evaluated).toBe(2)
    expect(r.rescheduleProposals).toBe(1)
    expect(r.needsHuman).toBe(1)
    expect(audit.events).toHaveLength(2)
    expect(audit.events[0].eventType).toBe(RESCHEDULE_PROPOSED_EVENT)
    expect(audit.events[0].actorType).toBe("system")
    // dry-run: emissions only — no assignment writes exist in these deps at all.
    expect(audit.events.every((e) => e.action === "work_order.reschedule_proposed")).toBe(true)
  })

  it("counts no_slot when reschedulable has no availability", async () => {
    const audit = new FakeAudit()
    const reader = new FakeReader([candidate({ windows: [] })])
    const r = await proposeReschedulesForTenant(deps(reader, audit), TENANT)
    expect(r.noSlot).toBe(1)
    expect(r.rescheduleProposals).toBe(0)
  })
})
