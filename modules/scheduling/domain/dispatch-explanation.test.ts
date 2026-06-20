import { describe, expect, it } from "vitest"

import {
  buildDispatchExplanation,
  failedReasons,
  passedReasons,
  primaryFailure,
  type ExplainCandidate,
} from "./dispatch-explanation"
import type { EligibilityReasons } from "./eligibility"

const ALL_OK: EligibilityReasons = {
  status: true, skill: true, zone: true, availability: true, capacity: true, noOverlap: true,
}

function cand(over: Partial<ExplainCandidate>): ExplainCandidate {
  return {
    name: over.name ?? "X",
    level: over.level ?? "senior",
    reasons: over.reasons ?? ALL_OK,
    slotKey: over.slotKey ?? 100,
    dayAssignmentCount: over.dayAssignmentCount ?? 0,
    skillRank: over.skillRank ?? 3,
  }
}

describe("dispatch-explanation", () => {
  it("técnico elegido: todos los criterios cumplidos, ninguno fallido", () => {
    expect(passedReasons(ALL_OK)).toHaveLength(6)
    expect(failedReasons(ALL_OK)).toHaveLength(0)
    expect(primaryFailure(ALL_OK)).toBeNull()
  })

  it("descartado por skill → motivo primario es skill", () => {
    const r = { ...ALL_OK, skill: false }
    expect(primaryFailure(r)).toBe("Tiene la skill requerida")
    expect(failedReasons(r)).toContain("Tiene la skill requerida")
  })

  it("descartado por capacidad → aparece en fallidos y no en cumplidos", () => {
    const r = { ...ALL_OK, capacity: false }
    expect(failedReasons(r)).toEqual(["Capacidad disponible"])
    expect(passedReasons(r)).not.toContain("Capacidad disponible")
  })
})

describe("buildDispatchExplanation (caso HVAC real)", () => {
  it("seleccionado senior + descartes ejecutables por nivel/disponibilidad", () => {
    const exp = buildDispatchExplanation({
      skillLabel: "HVAC",
      whenText: "el viernes 19 a las 3:30 p.m.",
      slaOk: true,
      chosen: cand({ name: "Daniel Peláez", level: "senior", skillRank: 3, slotKey: 100 }),
      discarded: [
        // Juniors disponibles al mismo horario → pierden por nivel.
        cand({ name: "Javier Ortiz", level: "junior", skillRank: 1, slotKey: 100 }),
        cand({ name: "Mauricio Ríos", level: "junior", skillRank: 1, slotKey: 100 }),
      ],
    })
    expect(exp.selected.name).toBe("Daniel Peláez")
    expect(exp.selected.level).toBe("Senior")
    expect(exp.selected.summary).toBe(
      "Daniel Peláez fue seleccionado por su disponibilidad, su nivel técnico y el cumplimiento del SLA.",
    )
    expect(exp.selected.motives).toEqual([
      "Tiene la especialidad de HVAC",
      "Nivel Senior en HVAC",
      "Está disponible el viernes 19 a las 3:30 p.m.",
      "Atiende dentro del tiempo comprometido con el cliente",
      "Tiene cupo en su agenda hoy",
    ])
    expect(exp.discarded[0]).toMatchObject({
      name: "Javier Ortiz",
      level: "Junior",
      reason: "Existe una alternativa con mayor nivel técnico.",
    })
  })

  it("experiencia en el tipo de daño: muestra representativa cita el % real", () => {
    const exp = buildDispatchExplanation({
      skillLabel: "HVAC",
      whenText: "hoy",
      slaOk: true,
      chosen: cand({ name: "Daniel Peláez", level: "senior" }),
      discarded: [],
      experience: {
        issueTypeLabel: "No enfría",
        completedCount: 48,
        resolvedCount: 50,
        successRate: 0.97,
      },
    })
    expect(exp.selected.motives).toContain(
      'Ha completado 48 trabajos de "No enfría" con 97% de éxito',
    )
  })

  it("experiencia con muestra pequeña: cita los trabajos pero NO el porcentaje", () => {
    const exp = buildDispatchExplanation({
      skillLabel: "HVAC",
      whenText: "hoy",
      slaOk: true,
      chosen: cand({ name: "Daniel Peláez", level: "senior" }),
      discarded: [],
      experience: {
        issueTypeLabel: "No enfría",
        completedCount: 1,
        resolvedCount: 1,
        successRate: 1,
      },
    })
    expect(exp.selected.motives).toContain('Ha completado 1 trabajo de "No enfría"')
    expect(exp.selected.motives.some((m) => m.includes("%"))).toBe(false)
  })

  it("descarte por horario y por carga tienen razones de negocio distintas", () => {
    const chosen = cand({ name: "Ana", slotKey: 100, dayAssignmentCount: 0 })
    const exp = buildDispatchExplanation({
      skillLabel: "HVAC",
      whenText: "hoy",
      slaOk: true,
      chosen,
      discarded: [
        cand({ name: "Tarde", slotKey: 200 }), // slot posterior
        cand({ name: "Lleno", reasons: { ...ALL_OK, availability: false }, slotKey: null }),
        cand({ name: "Cargado", slotKey: 100, dayAssignmentCount: 4 }),
      ],
    })
    expect(exp.discarded.map((d) => d.reason)).toEqual([
      "Ana puede atender antes.",
      "No tiene un horario libre para esta visita.",
      "Tiene más trabajos hoy; se prefirió equilibrar la carga.",
    ])
  })
})
