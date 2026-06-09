import { describe, expect, it } from "vitest"

import {
  filterAssignments,
  groupByHour,
  groupByTechnician,
  groupByWeekday,
  startOfWeekUtc,
} from "@/modules/calendar/application/calendar-grouping"
import type { WorkOrderAssignment } from "@/modules/scheduling/domain/work-order-assignment"

function a(
  over: Partial<WorkOrderAssignment> & { id: string; scheduledStart: string },
): WorkOrderAssignment {
  return {
    workOrderId: "wo",
    workOrderNumber: "WO-1",
    workOrderSubject: "Subject",
    technicianId: "tech-a",
    technicianName: "Ana",
    scheduledEnd: over.scheduledStart,
    estimatedDurationMinutes: 120,
    status: "scheduled",
    createdAt: "2026-06-09T00:00:00Z",
    updatedAt: "2026-06-09T00:00:00Z",
    ...over,
  }
}

// 2026-06-10 is a Wednesday.
const items: WorkOrderAssignment[] = [
  a({ id: "1", scheduledStart: "2026-06-10T08:00:00Z", technicianId: "tech-a", status: "scheduled" }),
  a({ id: "2", scheduledStart: "2026-06-10T08:30:00Z", technicianId: "tech-b", status: "in_progress" }),
  a({ id: "3", scheduledStart: "2026-06-10T14:00:00Z", technicianId: "tech-a", status: "completed" }),
  a({ id: "4", scheduledStart: "2026-06-12T09:00:00Z", technicianId: "tech-b", status: "scheduled" }), // Friday
]

describe("calendar grouping", () => {
  it("groups by hour (day view)", () => {
    const buckets = groupByHour(items)
    const at8 = buckets.find((b) => b.hour === 8)!
    const at14 = buckets.find((b) => b.hour === 14)!
    expect(at8.items.map((i) => i.id).sort()).toEqual(["1", "2"])
    expect(at14.items.map((i) => i.id)).toEqual(["3"])
    expect(buckets.find((b) => b.hour === 10)!.items).toHaveLength(0)
  })

  it("groups by weekday (week view)", () => {
    const weekStart = startOfWeekUtc("2026-06-10") // Monday 2026-06-08
    expect(weekStart.toISOString().slice(0, 10)).toBe("2026-06-08")
    const buckets = groupByWeekday(items, weekStart)
    // Wednesday = index 2 has 3 items; Friday = index 4 has 1.
    expect(buckets[2].items).toHaveLength(3)
    expect(buckets[4].items).toHaveLength(1)
    expect(buckets[0].items).toHaveLength(0) // Monday empty
  })

  it("groups by technician", () => {
    const groups = groupByTechnician(items)
    const a2 = groups.find((g) => g.technicianId === "tech-a")!
    const b2 = groups.find((g) => g.technicianId === "tech-b")!
    expect(a2.items).toHaveLength(2)
    expect(b2.items).toHaveLength(2)
    // sorted by start within group
    expect(a2.items.map((i) => i.id)).toEqual(["1", "3"])
  })

  it("filters by date window [from, to)", () => {
    const onlyWed = filterAssignments(items, {
      fromIso: "2026-06-10T00:00:00Z",
      toIso: "2026-06-11T00:00:00Z",
    })
    expect(onlyWed.map((i) => i.id).sort()).toEqual(["1", "2", "3"])
  })

  it("filters by status", () => {
    const scheduled = filterAssignments(items, { status: "scheduled" })
    expect(scheduled.map((i) => i.id).sort()).toEqual(["1", "4"])
  })

  it("filters by technician", () => {
    const techA = filterAssignments(items, { technicianId: "tech-a" })
    expect(techA.map((i) => i.id).sort()).toEqual(["1", "3"])
  })
})
