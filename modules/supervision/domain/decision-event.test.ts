import { describe, expect, it } from "vitest"

import type { UUID } from "@/types/shared"
import type { RawCommitment } from "./commitment"
import {
  buildSupervisionDecisionEvent,
  toDecisionSnapshot,
  type SupervisionDecisionInput,
} from "./decision-event"
import { judge } from "./judge"

const NOW = new Date("2026-06-30T12:00:00.000Z")
const H = 3_600_000
const iso = (offsetHours: number) => new Date(NOW.getTime() + offsetHours * H).toISOString()
const TENANT = "00000000-0000-0000-0000-0000000000aa" as UUID
const ACTOR = "00000000-0000-0000-0000-0000000000bb" as UUID

function raw(overrides: Partial<RawCommitment> = {}): RawCommitment {
  return {
    id: "wo-1",
    workOrderNumber: "1001",
    company: "ACME",
    subject: "Reparación",
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

function input(overrides: Partial<SupervisionDecisionInput> = {}): SupervisionDecisionInput {
  return {
    tenantId: TENANT,
    actorId: ACTOR,
    workOrderId: "wo-1",
    action: "reasignar",
    reason: "Mejor recurso disponible",
    priorIntent: "Lo mismo",
    snapshot: toDecisionSnapshot(judge(raw(), NOW)),
    ...overrides,
  }
}

describe("toDecisionSnapshot", () => {
  it("deriva el snapshot del juicio (intervención sugerida, valor, punto de no retorno, estado)", () => {
    const s = toDecisionSnapshot(judge(raw({ hasActiveAssignment: false, exposedValue: null }), NOW))
    expect(s.surfacedIntervention).toBe("ASSIGN_TECHNICIAN")
    expect(s.exposedValue).toBeNull()
    expect(s.pointOfNoReturnStatus).toBe("UNKNOWN")
    expect(s.estado).toBe("en_riesgo_accionable")
    expect(s.slaStatus).toBe("at_risk")
  })
})

describe("buildSupervisionDecisionEvent", () => {
  it("mapea una acción al contrato congelado de audit_events", () => {
    const ev = buildSupervisionDecisionEvent(input({ action: "reasignar" }))
    expect(ev.eventType).toBe("supervision.decision")
    expect(ev.actorType).toBe("user")
    expect(ev.subjectType).toBe("work_order")
    expect(ev.subjectId).toBe("wo-1")
    expect(ev.action).toBe("act")
    expect(ev.metadata).toMatchObject({
      schemaVersion: 1,
      decisionKind: "act",
      action: "reasignar",
      reason: "Mejor recurso disponible",
      priorIntent: "Lo mismo",
    })
  })

  it("descartar → decisionKind/action 'dismiss'", () => {
    const ev = buildSupervisionDecisionEvent(input({ action: "descartar" }))
    expect(ev.action).toBe("dismiss")
    const m = ev.metadata as Record<string, unknown>
    expect(m.decisionKind).toBe("dismiss")
    expect(m.action).toBe("descartar")
  })

  it("propaga el snapshot (valor null incluido) y priorIntent null", () => {
    const snapshot = toDecisionSnapshot(judge(raw({ exposedValue: null, hasActiveAssignment: false }), NOW))
    const ev = buildSupervisionDecisionEvent(input({ snapshot, priorIntent: null }))
    const m = ev.metadata as Record<string, unknown>
    expect(m.exposedValue).toBeNull()
    expect(m.priorIntent).toBeNull()
    expect(m.surfacedIntervention).toBe("ASSIGN_TECHNICIAN")
    expect(m.pointOfNoReturnStatus).toBe("UNKNOWN")
  })

  it("es determinístico: misma entrada → mismo evento", () => {
    const i = input()
    expect(buildSupervisionDecisionEvent(i)).toEqual(buildSupervisionDecisionEvent(i))
  })
})
