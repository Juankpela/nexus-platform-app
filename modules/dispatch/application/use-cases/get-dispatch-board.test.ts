import { describe, expect, it, vi } from "vitest"

import type { DispatchRepository } from "@/modules/dispatch/application/ports/dispatch-repository"
import { getDispatchBoard } from "@/modules/dispatch/application/use-cases/get-dispatch-board"

const TENANT = "11111111-1111-1111-1111-111111111111"

function rawWorkloads() {
  return [
    { technicianId: "av", technicianName: "Available Tech", technicianStatus: "active" as const, assignmentCount: 1, scheduledMinutes: 120 }, // 25% available
    { technicianId: "bu", technicianName: "Busy Tech", technicianStatus: "active" as const, assignmentCount: 3, scheduledMinutes: 420 }, // 88% busy
    { technicianId: "ov", technicianName: "Overloaded Tech", technicianStatus: "active" as const, assignmentCount: 5, scheduledMinutes: 600 }, // 125% overloaded
    { technicianId: "un", technicianName: "Inactive Tech", technicianStatus: "inactive" as const, assignmentCount: 0, scheduledMinutes: 0 }, // unavailable
  ]
}

function setup() {
  const dispatch = {
    getWorkloads: vi.fn().mockResolvedValue(rawWorkloads()),
    listDayAssignments: vi.fn().mockResolvedValue([]),
  } as unknown as DispatchRepository
  return { dispatch }
}

const input = {
  tenantId: TENANT,
  date: "2026-06-10",
  dayStartIso: "2026-06-10T00:00:00.000Z",
  dayEndIso: "2026-06-11T00:00:00.000Z",
}

describe("getDispatchBoard", () => {
  it("classifies each technician correctly", async () => {
    const { dispatch } = setup()
    const board = await getDispatchBoard({ dispatch }, input)
    const byId = Object.fromEntries(
      board.entries.map((e) => [e.workload.technicianId, e.workload.status]),
    )
    expect(byId.av).toBe("available")
    expect(byId.bu).toBe("busy")
    expect(byId.ov).toBe("overloaded")
    expect(byId.un).toBe("unavailable")
  })

  it("orders overloaded → busy → available → unavailable", async () => {
    const { dispatch } = setup()
    const board = await getDispatchBoard({ dispatch }, input)
    expect(board.entries.map((e) => e.workload.status)).toEqual([
      "overloaded",
      "busy",
      "available",
      "unavailable",
    ])
  })

  it("groups day assignments under their technician", async () => {
    const dispatch = {
      getWorkloads: vi.fn().mockResolvedValue([rawWorkloads()[0]]),
      listDayAssignments: vi.fn().mockResolvedValue([
        { id: "a1", technicianId: "av", workOrderNumber: "WO-1" },
        { id: "a2", technicianId: "av", workOrderNumber: "WO-2" },
      ]),
    } as unknown as DispatchRepository
    const board = await getDispatchBoard({ dispatch }, input)
    expect(board.entries[0].assignments).toHaveLength(2)
  })
})
