import { describe, expect, it } from "vitest"

import type { RawCommitment } from "./commitment"
import { judge } from "./judge"

const NOW = new Date("2026-06-30T12:00:00.000Z")
const H = 3_600_000
const iso = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * H).toISOString()

function raw(overrides: Partial<RawCommitment> = {}): RawCommitment {
  return {
    id: "wo-1",
    workOrderNumber: "1001",
    company: "ACME",
    subject: "Reparación",
    priority: "high", // SLA window 8 h → at_risk en el 25% final (≤ 2 h)
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

describe("judge", () => {
  it("asignado en ventana final del SLA → en_riesgo_accionable con punto de no retorno computado", () => {
    const j = judge(
      raw({
        hasActiveAssignment: true,
        technicianName: "Carlos",
        estimatedDurationMinutes: 60,
        slaDueAt: iso(1),
        scheduledEnd: iso(0.5),
      }),
      NOW,
    )
    expect(j.estado).toBe("en_riesgo_accionable")
    expect(j.inActionableWindow).toBe(true)
    expect(j.pointOfNoReturn.status).toBe("KNOWN")
    expect(j.pointOfNoReturn.ms).toBe(0) // plazo(1h) − duración(1h) − ahora(0) = 0
    expect(j.trajectoryOvershoots).toBe(false)
    expect(j.requiredIntervention).toBe("REVIEW")
    expect(j.tone).toBe("tension")
  })

  it("sin asignación → punto de no retorno UNKNOWN e intervención ASSIGN_TECHNICIAN", () => {
    const j = judge(raw({ hasActiveAssignment: false, slaDueAt: iso(1) }), NOW)
    expect(j.estado).toBe("en_riesgo_accionable")
    expect(j.pointOfNoReturn).toEqual({ ms: null, status: "UNKNOWN" })
    expect(j.requiredIntervention).toBe("ASSIGN_TECHNICIAN")
    expect(j.reasonWord).toBe("Sin asignar")
  })

  it("plazo vencido → perdido (fuera de la cola accionable)", () => {
    const j = judge(raw({ slaDueAt: iso(-1) }), NOW)
    expect(j.estado).toBe("perdido")
    expect(j.inActionableWindow).toBe(false)
  })

  it("dentro de SLA con holgura → sano", () => {
    const j = judge(raw({ slaDueAt: iso(10) }), NOW)
    expect(j.estado).toBe("sano")
  })

  it("sin plazo SLA → sin_datos y punto de no retorno UNKNOWN", () => {
    const j = judge(raw({ slaDueAt: null }), NOW)
    expect(j.estado).toBe("sin_datos")
    expect(j.pointOfNoReturn.status).toBe("UNKNOWN")
  })

  it("el plan termina después del plazo → RESCHEDULE / 'Plazo'", () => {
    const j = judge(
      raw({
        hasActiveAssignment: true,
        estimatedDurationMinutes: 30,
        slaDueAt: iso(1),
        scheduledEnd: iso(5),
      }),
      NOW,
    )
    expect(j.estado).toBe("en_riesgo_accionable")
    expect(j.trajectoryOvershoots).toBe(true)
    expect(j.requiredIntervention).toBe("RESCHEDULE")
    expect(j.reasonWord).toBe("Plazo")
  })

  it("es determinístico: misma entrada + mismo now → misma salida", () => {
    const c = raw({ hasActiveAssignment: true, estimatedDurationMinutes: 45, slaDueAt: iso(1) })
    expect(judge(c, NOW)).toEqual(judge(c, NOW))
  })
})
