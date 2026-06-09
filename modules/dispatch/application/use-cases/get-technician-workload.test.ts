import { describe, expect, it } from "vitest"

import { getTechnicianWorkload } from "@/modules/dispatch/application/use-cases/get-technician-workload"

const base = {
  technicianId: "11111111-1111-1111-1111-111111111111",
  technicianName: "Ana Gómez",
  technicianStatus: "active" as const,
  assignmentCount: 1,
}

describe("getTechnicianWorkload", () => {
  it("0 minutes → available, 0% utilization, full capacity available", () => {
    const w = getTechnicianWorkload({ ...base, scheduledMinutes: 0 })
    expect(w.utilizationPercent).toBe(0)
    expect(w.availableMinutes).toBe(480)
    expect(w.status).toBe("available")
  })

  it("4 hours (240 min) → 50%, still available", () => {
    const w = getTechnicianWorkload({ ...base, scheduledMinutes: 240 })
    expect(w.utilizationPercent).toBe(50)
    expect(w.availableMinutes).toBe(240)
    expect(w.status).toBe("available")
  })

  it("8 hours (480 min) → 100%, busy (boundary), no capacity left", () => {
    const w = getTechnicianWorkload({ ...base, scheduledMinutes: 480 })
    expect(w.utilizationPercent).toBe(100)
    expect(w.availableMinutes).toBe(0)
    expect(w.status).toBe("busy")
  })

  it("10 hours (600 min) → 125%, overloaded", () => {
    const w = getTechnicianWorkload({ ...base, scheduledMinutes: 600 })
    expect(w.utilizationPercent).toBe(125)
    expect(w.availableMinutes).toBe(0)
    expect(w.status).toBe("overloaded")
  })

  it("non-active technician → unavailable regardless of load", () => {
    const w = getTechnicianWorkload({
      ...base,
      technicianStatus: "on_leave",
      scheduledMinutes: 120,
    })
    expect(w.status).toBe("unavailable")
  })

  it("70% boundary → busy", () => {
    const w = getTechnicianWorkload({ ...base, scheduledMinutes: 336 }) // 70%
    expect(w.utilizationPercent).toBe(70)
    expect(w.status).toBe("busy")
  })
})
