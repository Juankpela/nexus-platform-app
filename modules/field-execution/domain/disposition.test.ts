import { describe, expect, it } from "vitest"

import {
  NON_COMPLETION_REASONS,
  autoActionAllowed,
  nextActionFor,
  reasonToDisposition,
} from "@/modules/field-execution/domain/disposition"

describe("reasonToDisposition", () => {
  it("maps reschedule-able causes to reschedulable", () => {
    expect(reasonToDisposition("customer_absent")).toBe("reschedulable")
    expect(reasonToDisposition("weather")).toBe("reschedulable")
  })
  it("maps a skill mismatch to reassignable", () => {
    expect(reasonToDisposition("missing_skill")).toBe("reassignable")
  })
  it("holds part/access for a human", () => {
    expect(reasonToDisposition("missing_part")).toBe("blocked_hold")
    expect(reasonToDisposition("access_denied")).toBe("blocked_hold")
  })
  it("treats a customer cancellation as terminal", () => {
    expect(reasonToDisposition("customer_cancelled")).toBe("terminal_no_action")
  })
  it("conservatively holds 'other' and a missing reason", () => {
    expect(reasonToDisposition("other")).toBe("blocked_hold")
    expect(reasonToDisposition(null)).toBe("blocked_hold")
  })
})

describe("autoActionAllowed", () => {
  it("permits auto-action ONLY for reschedulable/reassignable", () => {
    expect(autoActionAllowed("reschedulable")).toBe(true)
    expect(autoActionAllowed("reassignable")).toBe(true)
    expect(autoActionAllowed("blocked_hold")).toBe(false)
    expect(autoActionAllowed("terminal_no_action")).toBe(false)
  })

  it("never auto-acts on a cancellation or access-denied (frozen safety)", () => {
    expect(autoActionAllowed(reasonToDisposition("customer_cancelled"))).toBe(false)
    expect(autoActionAllowed(reasonToDisposition("access_denied"))).toBe(false)
  })

  it("every reason yields a defined disposition and next action", () => {
    for (const reason of NON_COMPLETION_REASONS) {
      const d = reasonToDisposition(reason)
      expect(["reschedulable", "reassignable", "blocked_hold", "terminal_no_action"]).toContain(d)
      expect(nextActionFor(d)).toBeDefined()
    }
  })
})

describe("nextActionFor", () => {
  it("maps dispositions to actions", () => {
    expect(nextActionFor("reschedulable")).toBe("auto_reschedule")
    expect(nextActionFor("reassignable")).toBe("auto_reassign")
    expect(nextActionFor("blocked_hold")).toBe("hold_for_human")
    expect(nextActionFor("terminal_no_action")).toBe("close_no_action")
  })
})
