import { describe, expect, it } from "vitest"

import { evaluateDispatchConfidence } from "./dispatch-confidence"

const base = {
  classificationConfidence: 0.9,
  confidenceThreshold: 0.7,
  hasSkill: true,
  hasEligibleTechnician: true,
  hasCapacity: true,
  hasSlot: true,
  slaOk: true,
  reportQualityOk: true,
}

describe("evaluateDispatchConfidence", () => {
  it("PROCEED cuando todas las señales están OK", () => {
    expect(evaluateDispatchConfidence(base).verdict).toBe("PROCEED")
  })

  it("ESCALATE si no se identificó una skill del tenant", () => {
    const r = evaluateDispatchConfidence({ ...base, hasSkill: false })
    expect(r.verdict).toBe("ESCALATE")
    expect(r.blockers).toContain("no_skill_identified")
  })

  it("ESCALATE si no hay técnico elegible", () => {
    const r = evaluateDispatchConfidence({ ...base, hasEligibleTechnician: false })
    expect(r.verdict).toBe("ESCALATE")
    expect(r.blockers).toContain("no_eligible_technician")
  })

  it("ESCALATE si el slot rompe SLA (prioridad sobre baja confianza)", () => {
    const r = evaluateDispatchConfidence({
      ...base,
      slaOk: false,
      classificationConfidence: 0.1,
    })
    expect(r.verdict).toBe("ESCALATE")
    expect(r.blockers).toContain("sla_risk")
  })

  it("HOLD cuando hay técnico+slot pero baja confianza", () => {
    const r = evaluateDispatchConfidence({ ...base, classificationConfidence: 0.5 })
    expect(r.verdict).toBe("HOLD")
    expect(r.blockers).toContain("low_classification_confidence")
  })

  it("HOLD cuando el reporte es de baja calidad", () => {
    const r = evaluateDispatchConfidence({ ...base, reportQualityOk: false })
    expect(r.verdict).toBe("HOLD")
    expect(r.blockers).toContain("poor_report_quality")
  })

  it("score baja al degradarse las señales operativas", () => {
    const full = evaluateDispatchConfidence(base).score
    const partial = evaluateDispatchConfidence({ ...base, hasSlot: false }).score
    expect(partial).toBeLessThan(full)
  })
})
