import { describe, expect, it } from "vitest"

import {
  buildAttentionItems,
  greetingFor,
} from "@/modules/platform/presentation/mission-control"

describe("greetingFor", () => {
  it("returns the right greeting per time of day", () => {
    expect(greetingFor(8)).toBe("Buenos días")
    expect(greetingFor(11)).toBe("Buenos días")
    expect(greetingFor(12)).toBe("Buenas tardes")
    expect(greetingFor(18)).toBe("Buenas tardes")
    expect(greetingFor(19)).toBe("Buenas noches")
    expect(greetingFor(23)).toBe("Buenas noches")
  })
})

describe("buildAttentionItems", () => {
  it("surfaces only items with count > 0", () => {
    const items = buildAttentionItems({
      breachedCases: 2,
      criticalCases: 0,
      overloadedTechnicians: 1,
      unscheduledWorkOrders: 0,
    })
    expect(items.map((i) => i.key)).toEqual([
      "sla_breached",
      "overloaded_technicians",
    ])
  })

  it("sorts critical before warning, then by count desc", () => {
    const items = buildAttentionItems({
      breachedCases: 1,
      criticalCases: 5,
      overloadedTechnicians: 9,
      unscheduledWorkOrders: 2,
    })
    expect(items.map((i) => i.key)).toEqual([
      "critical_cases", // critical, count 5
      "sla_breached", // critical, count 1
      "overloaded_technicians", // warning, count 9
      "unscheduled_work_orders", // warning, count 2
    ])
  })

  it("returns an empty list when everything is clear", () => {
    expect(
      buildAttentionItems({
        breachedCases: 0,
        criticalCases: 0,
        overloadedTechnicians: 0,
        unscheduledWorkOrders: 0,
      }),
    ).toEqual([])
  })
})
