import { describe, expect, it } from "vitest"

import type { RawCommitment } from "@/modules/supervision/domain/commitment"
import type { HealthFigures } from "@/modules/supervision/domain/health"
import { judge } from "@/modules/supervision/domain/judge"
import { formatWindow, toHealthSnapshot, toSupervisionItem } from "./to-view-model"

const NOW = new Date("2026-06-30T12:00:00.000Z")
const H = 3_600_000
const iso = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * H).toISOString()
const cap = { available: 2, active: 6 }

function raw(overrides: Partial<RawCommitment> = {}): RawCommitment {
  return {
    id: "x",
    workOrderNumber: "1001",
    company: "ACME",
    subject: "Reparación",
    priority: "high",
    status: "in_progress",
    slaDueAt: iso(1),
    scheduledEnd: null,
    resolvedAt: null,
    hasActiveAssignment: false,
    technicianName: null,
    estimatedDurationMinutes: null,
    exposedValue: null,
    ...overrides,
  }
}

describe("formatWindow", () => {
  it("UNKNOWN → 'desconocido' (nunca el plazo)", () => {
    expect(formatWindow({ ms: null, status: "UNKNOWN" })).toBe("desconocido")
  })
  it("'vencido' cuando ms ≤ 0", () => {
    expect(formatWindow({ ms: 0, status: "KNOWN" })).toBe("vencido")
  })
  it("horas y días", () => {
    expect(formatWindow({ ms: 3 * H, status: "KNOWN" })).toBe("en 3 h")
    expect(formatWindow({ ms: 72 * H, status: "KNOWN" })).toBe("en 3 días")
  })
})

describe("toSupervisionItem", () => {
  it("valor desconocido → '—'; intervención traducida; incertidumbre incluye las notas exactas", () => {
    const item = toSupervisionItem(judge(raw({ hasActiveAssignment: false }), NOW), cap)
    expect(item.valueExposed).toBe("—")
    expect(item.timeToPointOfNoReturn).toBe("desconocido")
    expect(item.recommendedAction).toBe("Asignar técnico")
    expect(item.evidence.uncertainty).toContain("no tiene duración estimada")
    expect(item.evidence.uncertainty).toContain("aún no tiene factura")
    expect(item.evidence.ifNothing).not.toMatch(/penaliz/i) // no inventa penalización
  })

  it("valor conocido → COP formateado en valueExposed y en 'si no se hace nada'", () => {
    const j = judge(
      raw({ hasActiveAssignment: true, technicianName: "Carlos", estimatedDurationMinutes: 60, exposedValue: 8_000_000 }),
      NOW,
    )
    const item = toSupervisionItem(j, cap)
    expect(item.valueExposed).toContain("8.000.000")
    expect(item.evidence.ifNothing).toContain("8.000.000")
  })
})

describe("toHealthSnapshot", () => {
  it("valores null → '—'; capacidad 'X de Y libres'", () => {
    const f: HealthFigures = {
      protectedValue: null,
      exposedValue: null,
      lostValue: null,
      available: 2,
      active: 6,
      trend: "flat",
      tone: "calm",
    }
    const h = toHealthSnapshot(f)
    expect(h.protectedToday).toBe("—")
    expect(h.exposedInWindow).toBe("—")
    expect(h.lostToday).toBe("—")
    expect(h.capacity).toBe("2 de 6 libres")
    expect(h.trend).toBe("flat")
  })
})
