import { describe, expect, it } from "vitest"

import {
  evaluateEligibility,
  isWithinAvailability,
  meetsCapacity,
  resolveLocalWindow,
  sortEligible,
  type EligibilityRequirement,
  type EligibilityResult,
  type TechnicianCapability,
} from "@/modules/scheduling/domain/eligibility"
import type {
  AvailabilityException,
  WeeklyWindow,
} from "@/modules/service/domain/availability"

const TZ = "America/Bogota" // UTC-5, sin DST

function win(weekday: number, startMinute: number, endMinute: number): WeeklyWindow {
  return { id: `w${weekday}`, weekday: weekday as WeeklyWindow["weekday"], startMinute, endMinute, createdAt: "t", updatedAt: "t" }
}

describe("resolveLocalWindow", () => {
  it("projects a UTC instant into Bogota wall-clock (UTC-5)", () => {
    // 2026-06-15 14:00Z → 09:00 local (Bogotá). 2026-06-15 is a Monday.
    const local = resolveLocalWindow("2026-06-15T14:00:00Z", "2026-06-15T16:00:00Z", TZ)
    expect(local).not.toBeNull()
    expect(local!.date).toBe("2026-06-15")
    expect(local!.weekday).toBe(1) // Monday
    expect(local!.startMinute).toBe(9 * 60)
    expect(local!.endMinute).toBe(11 * 60)
  })

  it("returns null for instants spanning two local days", () => {
    // 2026-06-16T04:00Z → 2026-06-15 23:00 local; 2026-06-16T06:00Z → 2026-06-16 01:00 local.
    expect(resolveLocalWindow("2026-06-16T04:00:00Z", "2026-06-16T06:00:00Z", TZ)).toBeNull()
  })

  it("returns null for malformed input", () => {
    expect(resolveLocalWindow("nope", "2026-06-15T16:00:00Z", TZ)).toBeNull()
  })
})

describe("isWithinAvailability", () => {
  const windows = [win(1, 480, 1020)] // Lunes 08:00–17:00
  const local = { date: "2026-06-15", weekday: 1 as const, startMinute: 540, endMinute: 660 }

  it("accepts a window that fully contains the request", () => {
    expect(isWithinAvailability(windows, [], local)).toBe(true)
  })

  it("rejects when no weekly window covers the request", () => {
    expect(isWithinAvailability([win(2, 480, 1020)], [], local)).toBe(false)
    expect(isWithinAvailability([win(1, 600, 1020)], [], local)).toBe(false) // empieza 10:00
  })

  it("rejects when a full-day exception blocks the date", () => {
    const ex: AvailabilityException = {
      id: "e", dateFrom: "2026-06-15", dateTo: "2026-06-15", startMinute: null, endMinute: null,
      kind: "vacation", note: null, createdAt: "t", updatedAt: "t",
    }
    expect(isWithinAvailability(windows, [ex], local)).toBe(false)
  })

  it("rejects when a partial exception overlaps the request", () => {
    const ex: AvailabilityException = {
      id: "e", dateFrom: "2026-06-15", dateTo: "2026-06-15", startMinute: 600, endMinute: 700,
      kind: "manual_block", note: null, createdAt: "t", updatedAt: "t",
    }
    expect(isWithinAvailability(windows, [ex], local)).toBe(false)
  })

  it("ignores a partial exception that does not overlap", () => {
    const ex: AvailabilityException = {
      id: "e", dateFrom: "2026-06-15", dateTo: "2026-06-15", startMinute: 700, endMinute: 800,
      kind: "manual_block", note: null, createdAt: "t", updatedAt: "t",
    }
    expect(isWithinAvailability(windows, [ex], local)).toBe(true)
  })
})

describe("meetsCapacity", () => {
  it("respects the work-order count cap", () => {
    expect(meetsCapacity({ maxWorkOrdersPerDay: 3, maxMinutesPerDay: null }, 2, 0, 60)).toBe(true)
    expect(meetsCapacity({ maxWorkOrdersPerDay: 3, maxMinutesPerDay: null }, 3, 0, 60)).toBe(false)
  })
  it("respects the minutes cap", () => {
    expect(meetsCapacity({ maxWorkOrdersPerDay: null, maxMinutesPerDay: 480 }, 0, 420, 60)).toBe(true)
    expect(meetsCapacity({ maxWorkOrdersPerDay: null, maxMinutesPerDay: 480 }, 0, 420, 120)).toBe(false)
  })
  it("null caps mean no limit", () => {
    expect(meetsCapacity({ maxWorkOrdersPerDay: null, maxMinutesPerDay: null }, 99, 9999, 999)).toBe(true)
  })
})

function capability(over: Partial<TechnicianCapability> = {}): TechnicianCapability {
  return {
    technicianId: "tech-1",
    technicianName: "Daniel",
    status: "active",
    skills: [{ skillId: "skill-1", level: "senior" }],
    zoneIds: ["zone-1"],
    windows: [win(1, 480, 1020)],
    exceptions: [],
    capacity: { maxWorkOrdersPerDay: 6, maxMinutesPerDay: 480 },
    dayAssignmentCount: 0,
    dayScheduledMinutes: 0,
    hasOverlap: false,
    ...over,
  }
}

const REQ: EligibilityRequirement = {
  skillId: "skill-1",
  minLevel: "mid",
  zoneId: "zone-1",
  startsAt: "2026-06-15T14:00:00Z", // 09:00 local Monday
  endsAt: "2026-06-15T16:00:00Z", // 11:00 local
}

describe("evaluateEligibility", () => {
  it("is eligible when every hard filter passes", () => {
    const r = evaluateEligibility(REQ, capability(), TZ)
    expect(r.eligible).toBe(true)
    expect(r.reasons).toEqual({
      status: true, skill: true, zone: true, availability: true, capacity: true, noOverlap: true,
    })
  })

  it("fails on insufficient skill level", () => {
    const r = evaluateEligibility(REQ, capability({ skills: [{ skillId: "skill-1", level: "junior" }] }), TZ)
    expect(r.eligible).toBe(false)
    expect(r.reasons.skill).toBe(false)
  })

  it("fails when zone not covered", () => {
    const r = evaluateEligibility(REQ, capability({ zoneIds: ["zone-2"] }), TZ)
    expect(r.reasons.zone).toBe(false)
  })

  it("fails on inactive status", () => {
    const r = evaluateEligibility(REQ, capability({ status: "on_leave" }), TZ)
    expect(r.reasons.status).toBe(false)
  })

  it("fails on overlap", () => {
    const r = evaluateEligibility(REQ, capability({ hasOverlap: true }), TZ)
    expect(r.reasons.noOverlap).toBe(false)
  })

  it("fails when the WO count cap is reached", () => {
    const r = evaluateEligibility(REQ, capability({ dayAssignmentCount: 6 }), TZ)
    expect(r.reasons.capacity).toBe(false)
  })

  it("treats null requirement fields as wildcards", () => {
    const r = evaluateEligibility({ ...REQ, skillId: null, zoneId: null, minLevel: null }, capability({ skills: [], zoneIds: [] }), TZ)
    expect(r.reasons.skill).toBe(true)
    expect(r.reasons.zone).toBe(true)
    expect(r.eligible).toBe(true)
  })
})

describe("sortEligible", () => {
  it("orders by lighter day-load first, then name (no weighting)", () => {
    const mk = (id: string, name: string, load: number): EligibilityResult => ({
      technicianId: id, technicianName: name, eligible: true,
      reasons: { status: true, skill: true, zone: true, availability: true, capacity: true, noOverlap: true },
      dayAssignmentCount: load,
    })
    const sorted = sortEligible([mk("a", "Zoe", 0), mk("b", "Ana", 2), mk("c", "Bob", 0)])
    expect(sorted.map((r) => r.technicianName)).toEqual(["Bob", "Zoe", "Ana"])
  })
})
