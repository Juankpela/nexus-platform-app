import { describe, expect, it } from "vitest"

import {
  buildOnboardingFlow,
  type OnboardingCounts,
} from "@/modules/platform/application/onboarding-flow"

const empty: OnboardingCounts = {
  clientes: 0,
  tecnicos: 0,
  trabajos: 0,
  cotizaciones: 0,
  facturas: 0,
}

describe("buildOnboardingFlow", () => {
  it("step 1 when there are no clients", () => {
    const f = buildOnboardingFlow(empty)
    expect(f.status).toBe("in_progress")
    if (f.status !== "in_progress") return
    expect(f.step.stepNumber).toBe(1)
    expect(f.step.ctaSegment).toBe("companies")
  })

  it("step 2 when there are clients but no technicians", () => {
    const f = buildOnboardingFlow({ ...empty, clientes: 3 })
    expect(f.status === "in_progress" && f.step.stepNumber).toBe(2)
    expect(f.status === "in_progress" && f.step.ctaSegment).toBe("technicians")
  })

  it("step 3 when clients and technicians exist but no work orders", () => {
    const f = buildOnboardingFlow({ ...empty, clientes: 3, tecnicos: 2 })
    expect(f.status === "in_progress" && f.step.stepNumber).toBe(3)
    expect(f.status === "in_progress" && f.step.ctaSegment).toBe("work-orders")
  })

  it("step 4 when work orders exist but no quotes", () => {
    const f = buildOnboardingFlow({ ...empty, clientes: 3, tecnicos: 2, trabajos: 1 })
    expect(f.status === "in_progress" && f.step.stepNumber).toBe(4)
    expect(f.status === "in_progress" && f.step.ctaSegment).toBe("quotes")
  })

  it("step 5 when quotes exist but no invoices", () => {
    const f = buildOnboardingFlow({
      ...empty,
      clientes: 3,
      tecnicos: 2,
      trabajos: 1,
      cotizaciones: 1,
    })
    expect(f.status === "in_progress" && f.step.stepNumber).toBe(5)
    expect(f.status === "in_progress" && f.step.ctaSegment).toBe("invoices")
  })

  it("done once the first invoice exists", () => {
    const f = buildOnboardingFlow({
      clientes: 3,
      tecnicos: 2,
      trabajos: 1,
      cotizaciones: 1,
      facturas: 1,
    })
    expect(f.status).toBe("done")
  })

  it("is strictly sequential — a later count does not skip an earlier gap", () => {
    // Invoices exist but no clients yet → still asks for step 1.
    const f = buildOnboardingFlow({ ...empty, facturas: 5 })
    expect(f.status === "in_progress" && f.step.stepNumber).toBe(1)
  })
})
