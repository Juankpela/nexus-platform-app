import { describe, expect, it } from "vitest"

import { planAutoDispatch } from "./plan-auto-dispatch"
import type { ReportClassifier } from "@/modules/scheduling/application/ports/report-classifier"
import type { DispatchCandidateReader } from "@/modules/scheduling/application/ports/dispatch-candidate-reader"
import type { TechnicianDispatchSnapshot } from "@/modules/scheduling/domain/dispatch-selection"

const HVAC = "11111111-1111-1111-1111-111111111111"

function classifier(over: Partial<Awaited<ReturnType<ReportClassifier["classify"]>>> = {}): ReportClassifier {
  return {
    classify: async () => ({
      skillId: HVAC,
      skillLabel: "HVAC",
      priority: "medium",
      estimatedDurationMinutes: 120,
      confidence: 0.9,
      ...over,
    }),
  }
}

function reader(snaps: TechnicianDispatchSnapshot[]): DispatchCandidateReader {
  return { listCandidates: async () => snaps }
}

function tech(): TechnicianDispatchSnapshot {
  return {
    technicianId: "t-1",
    technicianName: "Ana",
    status: "active",
    skills: [{ skillId: HVAC, level: "senior" }],
    zoneIds: [],
    windows: [{ id: "w", weekday: 1, startMinute: 480, endMinute: 1020, createdAt: "", updatedAt: "" }],
    exceptions: [],
    busy: [],
    capacity: { maxWorkOrdersPerDay: 5, maxMinutesPerDay: 480 },
    dayAssignmentCount: 0,
    dayScheduledMinutes: 0,
  }
}

// Lunes 2024-01-01 08:00 America/Bogota.
const nowMs = Date.parse("2024-01-01T13:00:00.000Z")
const deps = {
  nowMs,
  timeZone: "America/Bogota",
  horizonDays: 7,
  confidenceThreshold: 0.7,
}
const input = {
  tenantId: "tnt",
  caseId: "case-1",
  description: "El aire acondicionado del tercer piso dejó de enfriar.",
  slaDueAt: null,
}

describe("planAutoDispatch", () => {
  it("PROCEED: clasifica, selecciona técnico y calcula ventana — sin escribir", async () => {
    const plan = await planAutoDispatch(
      { ...deps, classifier: classifier(), candidates: reader([tech()]) },
      { ...input, availableSkills: [{ id: HVAC, name: "HVAC" }] },
    )
    expect(plan.verdict).toBe("PROCEED")
    expect(plan.chosen?.technicianId).toBe("t-1")
    expect(plan.startsAt).not.toBeNull()
    expect(plan.endsAt).not.toBeNull()
  })

  it("ESCALATE si no hay técnico elegible", async () => {
    const plan = await planAutoDispatch(
      { ...deps, classifier: classifier(), candidates: reader([]) },
      { ...input, availableSkills: [{ id: HVAC, name: "HVAC" }] },
    )
    expect(plan.verdict).toBe("ESCALATE")
    expect(plan.chosen).toBeNull()
  })

  it("ESCALATE si no se identificó una skill del tenant (sin asignar a ciegas)", async () => {
    const plan = await planAutoDispatch(
      {
        ...deps,
        classifier: classifier({ skillId: null, confidence: 0 }),
        candidates: reader([tech()]),
      },
      { ...input, availableSkills: [] },
    )
    // skillId null → bloqueo duro: nunca se asigna sin skill del tenant.
    expect(plan.verdict).toBe("ESCALATE")
    expect(plan.confidence.blockers).toContain("no_skill_identified")
  })

  it("ESCALATE si el slot rompe el SLA", async () => {
    const plan = await planAutoDispatch(
      { ...deps, classifier: classifier(), candidates: reader([tech()]) },
      {
        ...input,
        availableSkills: [{ id: HVAC, name: "HVAC" }],
        slaDueAt: "2024-01-01T12:00:00.000Z", // antes de cualquier slot posible
      },
    )
    expect(plan.verdict).toBe("ESCALATE")
    expect(plan.confidence.blockers).toContain("sla_risk")
  })
})
