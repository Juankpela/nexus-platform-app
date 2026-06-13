import { describe, expect, it } from "vitest"

import {
  hhmmToMinutes,
  isValidWindow,
  isWeekday,
  minutesToHHMM,
} from "@/modules/service/domain/availability"

describe("hhmmToMinutes / minutesToHHMM", () => {
  it("parses valid times", () => {
    expect(hhmmToMinutes("00:00")).toBe(0)
    expect(hhmmToMinutes("08:30")).toBe(510)
    expect(hhmmToMinutes("23:59")).toBe(1439)
  })

  it("rejects malformed or out-of-range times", () => {
    expect(hhmmToMinutes("8:30")).toBeNull()
    expect(hhmmToMinutes("24:00")).toBeNull()
    expect(hhmmToMinutes("10:60")).toBeNull()
    expect(hhmmToMinutes("abc")).toBeNull()
  })

  it("formats minutes back to HH:MM", () => {
    expect(minutesToHHMM(0)).toBe("00:00")
    expect(minutesToHHMM(510)).toBe("08:30")
    expect(minutesToHHMM(1440)).toBe("24:00")
  })

  it("round-trips", () => {
    for (const t of ["00:00", "06:15", "12:00", "17:45", "23:59"]) {
      expect(minutesToHHMM(hhmmToMinutes(t) as number)).toBe(t)
    }
  })
})

describe("isValidWindow", () => {
  it("accepts an in-day window with end after start", () => {
    expect(isValidWindow(480, 1020)).toBe(true) // 08:00–17:00
    expect(isValidWindow(0, 1440)).toBe(true) // full day
  })

  it("rejects inverted, empty, or out-of-range windows", () => {
    expect(isValidWindow(1020, 480)).toBe(false)
    expect(isValidWindow(600, 600)).toBe(false)
    expect(isValidWindow(-1, 600)).toBe(false)
    expect(isValidWindow(0, 1441)).toBe(false)
  })
})

describe("isWeekday", () => {
  it("accepts 0..6 only", () => {
    expect(isWeekday(0)).toBe(true)
    expect(isWeekday(6)).toBe(true)
    expect(isWeekday(7)).toBe(false)
    expect(isWeekday(-1)).toBe(false)
  })
})
