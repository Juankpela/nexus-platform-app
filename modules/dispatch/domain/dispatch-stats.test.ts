import { describe, expect, it } from "vitest"

import { computeDispatchStats } from "@/modules/dispatch/domain/dispatch-stats"
import { buildTechnicianWorkload } from "@/modules/dispatch/domain/technician-workload"

function wl(name: string, minutes: number, status: "active" | "inactive" = "active") {
  return buildTechnicianWorkload({
    technicianId: name,
    technicianName: name,
    technicianStatus: status,
    assignmentCount: 1,
    scheduledMinutes: minutes,
  })
}

describe("computeDispatchStats", () => {
  it("aggregates counts and average utilization over active technicians", () => {
    const workloads = [
      wl("a", 120), // available 25%
      wl("b", 420), // busy 88%
      wl("c", 600), // overloaded 125%
      wl("d", 0, "inactive"), // unavailable (excluded from average)
    ]
    const stats = computeDispatchStats(workloads, 9)

    expect(stats.assignmentsToday).toBe(9)
    expect(stats.activeTechnicians).toBe(3)
    expect(stats.availableTechnicians).toBe(1)
    expect(stats.busyTechnicians).toBe(1)
    expect(stats.overloadedTechnicians).toBe(1)
    // (25 + 88 + 125) / 3 = 79.33 → 79
    expect(stats.averageUtilization).toBe(79)
  })

  it("returns null average when there are no active technicians", () => {
    const stats = computeDispatchStats([wl("d", 0, "inactive")], 0)
    expect(stats.activeTechnicians).toBe(0)
    expect(stats.averageUtilization).toBeNull()
  })
})
