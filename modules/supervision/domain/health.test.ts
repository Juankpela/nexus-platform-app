import { describe, expect, it } from "vitest"

import type { DispatchStats } from "@/modules/dispatch/domain/dispatch-stats"
import type { RawCommitment } from "./commitment"
import { buildHealth } from "./health"
import { judge } from "./judge"

const NOW = new Date("2026-06-30T12:00:00.000Z")
const H = 3_600_000
const iso = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * H).toISOString()

function raw(overrides: Partial<RawCommitment> = {}): RawCommitment {
  return {
    id: "x",
    workOrderNumber: "n",
    company: null,
    subject: "s",
    priority: "high",
    status: "in_progress",
    slaDueAt: iso(1), // at_risk → accionable
    scheduledEnd: null,
    resolvedAt: null,
    hasActiveAssignment: false,
    technicianName: null,
    estimatedDurationMinutes: null,
    exposedValue: null,
    ...overrides,
  }
}
function stats(overrides: Partial<DispatchStats> = {}): DispatchStats {
  return {
    assignmentsToday: 0,
    activeTechnicians: 6,
    availableTechnicians: 2,
    busyTechnicians: 3,
    overloadedTechnicians: 1,
    averageUtilization: 50,
    ...overrides,
  }
}

describe("buildHealth", () => {
  it("sin accionables → tono calmo, expuesto desconocido, protegido/perdido null, capacidad real", () => {
    const f = buildHealth([], stats())
    expect(f.tone).toBe("calm")
    expect(f.exposedValue).toBeNull()
    expect(f.protectedValue).toBeNull()
    expect(f.lostValue).toBeNull()
    expect(f.trend).toBe("flat")
    expect(f.available).toBe(2)
    expect(f.active).toBe(6)
  })

  it("accionables TODOS con valor → suma; tono tensión", () => {
    const a = judge(raw({ id: "a", exposedValue: 1_000_000 }), NOW)
    const b = judge(raw({ id: "b", exposedValue: 2_500_000 }), NOW)
    const f = buildHealth([a, b], stats())
    expect(f.exposedValue).toBe(3_500_000)
    expect(f.tone).toBe("tension")
  })

  it("algún accionable sin valor → total desconocido (null), no un parcial engañoso", () => {
    const a = judge(raw({ id: "a", exposedValue: 1_000_000 }), NOW)
    const b = judge(raw({ id: "b", exposedValue: null }), NOW)
    expect(buildHealth([a, b], stats()).exposedValue).toBeNull()
  })

  it("recursos saturados → 0 disponibles sobre el total real", () => {
    const f = buildHealth([], stats({ availableTechnicians: 0, activeTechnicians: 6 }))
    expect(f.available).toBe(0)
    expect(f.active).toBe(6)
  })
})
