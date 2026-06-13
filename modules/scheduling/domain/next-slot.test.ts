import { describe, expect, it } from "vitest"

import { findNextSlot, type FindNextSlotParams } from "@/modules/scheduling/domain/next-slot"
import type { AvailabilityException, WeeklyWindow } from "@/modules/service/domain/availability"

// 2026-06-15 is Monday (weekday 1) … 2026-06-19 Friday (5), 2026-06-20 Saturday (6).
function win(weekday: number, startMinute: number, endMinute: number): WeeklyWindow {
  return { id: `w${weekday}-${startMinute}`, weekday: weekday as WeeklyWindow["weekday"], startMinute, endMinute, createdAt: "", updatedAt: "" }
}

const MON_FRI = [1, 2, 3, 4, 5].map((d) => win(d, 480, 1020)) // 08:00–17:00

function run(over: Partial<FindNextSlotParams> = {}) {
  return findNextSlot({
    windows: MON_FRI,
    busy: [],
    exceptions: [],
    durationMinutes: 120,
    fromDate: "2026-06-15",
    fromMinute: 0,
    horizonDays: 14,
    ...over,
  })
}

describe("findNextSlot", () => {
  it("returns the window start when the day is free", () => {
    expect(run()).toEqual({ date: "2026-06-15", weekday: 1, startMinute: 480, endMinute: 600 })
  })

  it("respects the earliest minute on the first day", () => {
    expect(run({ fromMinute: 700 })).toEqual({ date: "2026-06-15", weekday: 1, startMinute: 700, endMinute: 820 })
  })

  it("skips a busy interval and proposes the gap after it", () => {
    const busy = [{ date: "2026-06-15", startMinute: 480, endMinute: 660 }] // 08:00–11:00 taken
    expect(run({ busy })).toEqual({ date: "2026-06-15", weekday: 1, startMinute: 660, endMinute: 780 })
  })

  it("rolls to the next day when today has no fitting gap", () => {
    // Monday fully booked 08:00–17:00.
    const busy = [{ date: "2026-06-15", startMinute: 480, endMinute: 1020 }]
    expect(run({ busy })).toEqual({ date: "2026-06-16", weekday: 2, startMinute: 480, endMinute: 600 })
  })

  it("skips weekends (no window) to Monday", () => {
    // Start Saturday 2026-06-20; next availability is Monday 2026-06-22.
    expect(run({ fromDate: "2026-06-20" })).toEqual({ date: "2026-06-22", weekday: 1, startMinute: 480, endMinute: 600 })
  })

  it("skips a full-day exception", () => {
    const exceptions: AvailabilityException[] = [
      { id: "e", dateFrom: "2026-06-15", dateTo: "2026-06-15", startMinute: null, endMinute: null, kind: "vacation", note: null, createdAt: "", updatedAt: "" },
    ]
    expect(run({ exceptions })?.date).toBe("2026-06-16")
  })

  it("works around a partial-day exception", () => {
    const exceptions: AvailabilityException[] = [
      { id: "e", dateFrom: "2026-06-15", dateTo: "2026-06-15", startMinute: 480, endMinute: 660, kind: "manual_block", note: null, createdAt: "", updatedAt: "" },
    ]
    expect(run({ exceptions })).toEqual({ date: "2026-06-15", weekday: 1, startMinute: 660, endMinute: 780 })
  })

  it("returns null when nothing fits within the horizon", () => {
    expect(run({ durationMinutes: 600 })).toBeNull() // 10h > 9h window
    expect(run({ horizonDays: 0 })).toBeNull()
  })

  it("returns null for a non-positive duration", () => {
    expect(run({ durationMinutes: 0 })).toBeNull()
  })
})
