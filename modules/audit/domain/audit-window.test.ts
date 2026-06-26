import { describe, expect, it } from "vitest"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  AUDIT_WINDOW_DEFAULT_LIMIT,
  AUDIT_WINDOW_MAX_LIMIT,
  resolveAuditWindow,
} from "@/modules/audit/domain/audit-window"

const START = "2026-06-01T00:00:00.000Z"
const END = "2026-06-25T00:00:00.000Z"

describe("resolveAuditWindow", () => {
  it("normalizes a valid window with defaults", () => {
    const q = resolveAuditWindow({ start: START, end: END })
    expect(q.startISO).toBe(START)
    expect(q.endISO).toBe(END)
    expect(q.eventTypes).toEqual([])
    expect(q.limit).toBe(AUDIT_WINDOW_DEFAULT_LIMIT)
  })

  it("dedupes and trims event types, dropping blanks", () => {
    const q = resolveAuditWindow({
      start: START,
      end: END,
      eventTypes: ["  service.work_order.completed ", "service.work_order.completed", "payment.recorded", "", "   "],
    })
    expect(q.eventTypes).toEqual(["service.work_order.completed", "payment.recorded"])
  })

  it("caps the limit at the max and floors it at 1", () => {
    expect(resolveAuditWindow({ start: START, end: END, limit: 10_000 }).limit).toBe(AUDIT_WINDOW_MAX_LIMIT)
    expect(resolveAuditWindow({ start: START, end: END, limit: 0 }).limit).toBe(1)
    expect(resolveAuditWindow({ start: START, end: END, limit: -5 }).limit).toBe(1)
  })

  it("accepts an equal start and end (point-in-time read)", () => {
    expect(() => resolveAuditWindow({ start: START, end: START })).not.toThrow()
  })

  it("rejects a window whose start is after its end", () => {
    expect(() => resolveAuditWindow({ start: END, end: START })).toThrowError(ApplicationError)
  })

  it("rejects an unparseable timestamp", () => {
    expect(() => resolveAuditWindow({ start: "not-a-date", end: END })).toThrowError(ApplicationError)
  })

  it("tags window errors with INVALID_AUDIT_WINDOW", () => {
    try {
      resolveAuditWindow({ start: END, end: START })
      throw new Error("expected resolveAuditWindow to throw")
    } catch (e) {
      expect(e).toBeInstanceOf(ApplicationError)
      expect((e as ApplicationError).code).toBe("INVALID_AUDIT_WINDOW")
    }
  })
})
