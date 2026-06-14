import { describe, expect, it } from "vitest"

import type { EligibilityResolver } from "@/modules/scheduling/application/ports/eligibility-resolver"
import type { RescheduleCandidateReader } from "@/modules/scheduling/application/ports/reschedule-candidate-reader"
import type { EligibilityResult } from "@/modules/scheduling/domain/eligibility"
import type { RescheduleCandidate } from "@/modules/scheduling/domain/reschedule-proposal"
import {
  planReschedule,
  type PlanRescheduleDeps,
} from "@/modules/scheduling/application/use-cases/plan-reschedule"
import type { WeeklyWindow } from "@/modules/service/domain/availability"

const TENANT = "11111111-1111-1111-1111-111111111111"
const WO = "wo-1"
const MON_FRI: WeeklyWindow[] = [1, 2, 3, 4, 5].map((d) => ({
  id: `w${d}`, weekday: d as WeeklyWindow["weekday"], startMinute: 480, endMinute: 1020, createdAt: "", updatedAt: "",
}))

function candidate(over: Partial<RescheduleCandidate> = {}): RescheduleCandidate {
  return {
    workOrderId: WO, workOrderNumber: "WO-1", assignmentId: "a-1",
    technicianId: "tech-current", technicianName: "Actual",
    nonCompletionReason: "customer_absent", disposition: "reschedulable",
    durationMinutes: 90, windows: MON_FRI, exceptions: [], busy: [], ...over,
  }
}

class FakeCandidates implements RescheduleCandidateReader {
  constructor(private readonly list: RescheduleCandidate[]) {}
  async listActionableCandidates() {
    return this.list
  }
}
class FakeScheduling {
  constructor(private readonly activeId: string | null) {}
  async findActiveByWorkOrders() {
    return this.activeId ? [{ id: this.activeId } as never] : []
  }
}
function eligibleResult(id: string, eligible: boolean, load = 0): EligibilityResult {
  return {
    technicianId: id, technicianName: id, eligible, dayAssignmentCount: load,
    reasons: { status: true, skill: true, zone: true, availability: true, capacity: true, noOverlap: true },
  }
}
class FakeResolver implements EligibilityResolver {
  constructor(private readonly results: EligibilityResult[]) {}
  async findEligible() {
    return this.results
  }
}

function deps(over: Partial<PlanRescheduleDeps> = {}): PlanRescheduleDeps {
  return {
    candidates: new FakeCandidates([candidate()]),
    scheduling: new FakeScheduling("a-1"),
    resolver: new FakeResolver([]),
    nowMs: Date.parse("2026-06-15T12:00:00Z"), // Monday 07:00 local Bogotá
    timeZone: "America/Bogota",
    horizonDays: 14,
    ...over,
  }
}

describe("planReschedule", () => {
  it("same_tech: keeps the technician and finds the next slot", async () => {
    const plan = await planReschedule(deps(), { tenantId: TENANT, workOrderId: WO, mode: "same_tech" })
    expect(plan.technicianId).toBe("tech-current")
    expect(plan.activeAssignmentId).toBe("a-1")
    // 07:00 local < window start 08:00 → slot starts 08:00 local = 13:00 UTC.
    expect(plan.startsAt).toBe("2026-06-15T13:00:00.000Z")
    expect(plan.endsAt).toBe("2026-06-15T14:30:00.000Z")
  })

  it("suggested: picks the top eligible alternative (not the current tech)", async () => {
    const plan = await planReschedule(
      deps({
        resolver: new FakeResolver([
          eligibleResult("tech-current", true, 0), // excluded (current)
          eligibleResult("tech-b", true, 1),
        ]),
      }),
      { tenantId: TENANT, workOrderId: WO, mode: "suggested" },
    )
    expect(plan.technicianId).toBe("tech-b")
  })

  it("suggested: errors when no alternative is eligible", async () => {
    await expect(
      planReschedule(
        deps({ resolver: new FakeResolver([eligibleResult("tech-current", true)]) }),
        { tenantId: TENANT, workOrderId: WO, mode: "suggested" },
      ),
    ).rejects.toMatchObject({ code: "NO_ALTERNATIVE_TECHNICIAN" })
  })

  it("errors when the WO is not a reschedule candidate", async () => {
    await expect(
      planReschedule(deps({ candidates: new FakeCandidates([]) }), { tenantId: TENANT, workOrderId: WO, mode: "same_tech" }),
    ).rejects.toMatchObject({ code: "NO_RESCHEDULE_CANDIDATE" })
  })

  it("errors when no slot fits", async () => {
    await expect(
      planReschedule(deps({ candidates: new FakeCandidates([candidate({ windows: [] })]) }), {
        tenantId: TENANT, workOrderId: WO, mode: "same_tech",
      }),
    ).rejects.toMatchObject({ code: "NO_SLOT" })
  })
})
