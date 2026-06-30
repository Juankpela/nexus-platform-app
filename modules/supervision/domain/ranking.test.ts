import { describe, expect, it } from "vitest"

import type { RawCommitment } from "./commitment"
import { judge } from "./judge"
import { prioritize } from "./ranking"

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
    slaDueAt: null,
    scheduledEnd: null,
    resolvedAt: null,
    hasActiveAssignment: false,
    technicianName: null,
    estimatedDurationMinutes: null,
    exposedValue: null,
    ...overrides,
  }
}
const actionable = (overrides: Partial<RawCommitment>) => raw({ slaDueAt: iso(1), ...overrides })

describe("prioritize", () => {
  it("operación vacía → sin accionables, cero bajo umbral", () => {
    expect(prioritize([])).toEqual({ actionable: [], belowThresholdCount: 0 })
  })

  it("ordena por valor descendente cuando se conoce", () => {
    const a = judge(actionable({ id: "a", exposedValue: 5_000_000 }), NOW)
    const b = judge(actionable({ id: "b", exposedValue: 8_000_000 }), NOW)
    expect(prioritize([a, b]).actionable.map((j) => j.commitment.id)).toEqual(["b", "a"])
  })

  it("valor conocido va antes que valor desconocido", () => {
    const known = judge(actionable({ id: "known", exposedValue: 1_000_000 }), NOW)
    const unknown = judge(actionable({ id: "unknown", exposedValue: null }), NOW)
    expect(prioritize([unknown, known]).actionable[0].commitment.id).toBe("known")
  })

  it("sin valor → ordena por urgencia (ventana que cierra antes primero)", () => {
    const soon = judge(actionable({ id: "soon", slaDueAt: iso(0.5) }), NOW)
    const later = judge(actionable({ id: "later", slaDueAt: iso(1.5) }), NOW)
    expect(prioritize([later, soon]).actionable.map((j) => j.commitment.id)).toEqual(["soon", "later"])
  })

  it("bajo umbral cuenta solo abiertos sanos (excluye perdidos y terminales)", () => {
    const risky = judge(actionable({ id: "r" }), NOW)
    const healthy = judge(raw({ id: "h", slaDueAt: iso(10) }), NOW) // sano, abierto
    const lost = judge(raw({ id: "l", slaDueAt: iso(-1) }), NOW) // perdido
    const doneHealthy = judge(raw({ id: "d", status: "completed", slaDueAt: iso(10) }), NOW) // terminal
    const result = prioritize([risky, healthy, lost, doneHealthy])
    expect(result.actionable.map((j) => j.commitment.id)).toEqual(["r"])
    expect(result.belowThresholdCount).toBe(1)
  })
})
