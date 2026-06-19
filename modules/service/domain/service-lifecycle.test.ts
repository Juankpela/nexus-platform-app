import { describe, expect, it } from "vitest"

import {
  buildServiceLifecycle,
  type ServiceLifecycleInput,
} from "@/modules/service/domain/service-lifecycle"

const base: ServiceLifecycleInput = {
  reportedAt: "2026-06-19T10:00:00Z",
  coordinatedAt: null,
  technicianName: null,
  scheduledStart: null,
  acceptedAt: null,
  enRouteAt: null,
  arrivedAt: null,
  startedAt: null,
  completedAt: null,
  unableAt: null,
  unableReason: null,
  invoiceIssuedAt: null,
  paidAt: null,
}

const state = (ms: ReturnType<typeof buildServiceLifecycle>, key: string) =>
  ms.find((m) => m.key === key)!.state

describe("buildServiceLifecycle", () => {
  it("returns the 9 canonical milestones in order", () => {
    const ms = buildServiceLifecycle(base)
    expect(ms.map((m) => m.key)).toEqual([
      "reported",
      "coordinated",
      "accepted",
      "en_route",
      "on_site",
      "working",
      "completed",
      "invoiced",
      "paid",
    ])
  })

  it("marks reported done and coordination as the current step right after intake", () => {
    const ms = buildServiceLifecycle(base)
    expect(state(ms, "reported")).toBe("done")
    expect(state(ms, "coordinated")).toBe("current")
    expect(state(ms, "accepted")).toBe("pending")
  })

  it("puts the recommended technician + schedule on the coordinated milestone", () => {
    const ms = buildServiceLifecycle({
      ...base,
      coordinatedAt: "2026-06-19T11:00:00Z",
      technicianName: "Daniel Peláez",
      scheduledStart: "2026-06-19T15:00:00Z",
    })
    const coord = ms.find((m) => m.key === "coordinated")!
    expect(coord.state).toBe("done")
    expect(coord.detail).toContain("Daniel Peláez")
    expect(coord.detail).toContain("agendado para")
  })

  it("backfills earlier milestones when a later one happened (monotonic)", () => {
    // Arrived on site but the 'en route' notice was never sent.
    const ms = buildServiceLifecycle({
      ...base,
      coordinatedAt: "2026-06-19T11:00:00Z",
      acceptedAt: "2026-06-19T12:00:00Z",
      arrivedAt: "2026-06-19T15:00:00Z",
    })
    expect(state(ms, "en_route")).toBe("done") // backfilled
    expect(state(ms, "on_site")).toBe("done")
    expect(state(ms, "working")).toBe("current")
  })

  it("marks every milestone done when the cycle is fully paid", () => {
    const ms = buildServiceLifecycle({
      ...base,
      coordinatedAt: "t",
      acceptedAt: "t",
      enRouteAt: "t",
      arrivedAt: "t",
      startedAt: "t",
      completedAt: "t",
      invoiceIssuedAt: "t",
      paidAt: "2026-06-20T09:00:00Z",
    })
    expect(ms.every((m) => m.state === "done")).toBe(true)
  })

  it("blocks the in-progress step when execution is unable to complete", () => {
    const ms = buildServiceLifecycle({
      ...base,
      coordinatedAt: "t",
      acceptedAt: "t",
      arrivedAt: "t",
      unableAt: "2026-06-19T16:00:00Z",
      unableReason: "Cliente ausente",
    })
    const working = ms.find((m) => m.key === "working")!
    expect(working.state).toBe("blocked")
    expect(working.detail).toBe("Cliente ausente")
  })

  it("blocks with 'Cancelada' when the work order is cancelled", () => {
    const ms = buildServiceLifecycle({
      ...base,
      coordinatedAt: "t",
      cancelled: true,
    })
    const blocked = ms.find((m) => m.state === "blocked")
    expect(blocked?.detail).toBe("Cancelada")
  })
})
