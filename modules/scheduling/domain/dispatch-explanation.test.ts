import { describe, expect, it } from "vitest"

import { failedReasons, passedReasons, primaryFailure } from "./dispatch-explanation"
import type { EligibilityReasons } from "./eligibility"

const ALL_OK: EligibilityReasons = {
  status: true, skill: true, zone: true, availability: true, capacity: true, noOverlap: true,
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
