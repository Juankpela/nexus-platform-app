import { describe, expect, it } from "vitest"

import { coordinatedStart, planAutoDispatch } from "./plan-auto-dispatch"
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

  it("coordina el horario: aplica lead + redondeo, no la hora exacta de entrada", async () => {
    // Entra 08:00 Bogotá (minuto 480), ventana del técnico 08:00–17:00.
    // Sin coordinación, el slot sería 480. Con lead 45 + granularidad 30 → 540 (09:00).
    const plan = await planAutoDispatch(
      {
        ...deps,
        leadMinutes: 45,
        slotGranularityMinutes: 30,
        classifier: classifier(),
        candidates: reader([tech()]),
      },
      { ...input, availableSkills: [{ id: HVAC, name: "HVAC" }] },
    )
    expect(plan.verdict).toBe("PROCEED")
    expect(plan.chosen?.slot?.startMinute).toBe(540)
  })

  it("coordinatedStart redondea y desborda al día siguiente tras medianoche", () => {
    // Sin lead ni granularidad: queda igual.
    expect(coordinatedStart("2024-01-01", 480, 0, 0)).toEqual({
      fromDate: "2024-01-01",
      fromMinute: 480,
    })
    // Lead 60 + granularidad 30 sobre 14:22 (862) → 922 → ceil a 930 (15:30).
    expect(coordinatedStart("2024-01-01", 862, 60, 30)).toEqual({
      fromDate: "2024-01-01",
      fromMinute: 930,
    })
    // 23:50 (1430) + 60 = 1490 → redondeo a 1500 → cruza medianoche → 01:00 (60).
    expect(coordinatedStart("2024-01-01", 1430, 60, 30)).toEqual({
      fromDate: "2024-01-02",
      fromMinute: 60,
    })
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
