import { describe, expect, it } from "vitest"

import { selectDispatch, type TechnicianDispatchSnapshot } from "./dispatch-selection"

const HVAC = "11111111-1111-1111-1111-111111111111"
const ZONE = "22222222-2222-2222-2222-222222222222"

function tech(over: Partial<TechnicianDispatchSnapshot>): TechnicianDispatchSnapshot {
  return {
    technicianId: over.technicianId ?? "t-1",
    technicianName: over.technicianName ?? "Ana",
    status: over.status ?? "active",
    skills: over.skills ?? [{ skillId: HVAC, level: "senior" }],
    zoneIds: over.zoneIds ?? [ZONE],
    windows: over.windows ?? [
      { id: "w", weekday: 1, startMinute: 480, endMinute: 1020, createdAt: "", updatedAt: "" },
    ],
    exceptions: over.exceptions ?? [],
    busy: over.busy ?? [],
    capacity: over.capacity ?? { maxWorkOrdersPerDay: 5, maxMinutesPerDay: 480 },
    dayAssignmentCount: over.dayAssignmentCount ?? 0,
    dayScheduledMinutes: over.dayScheduledMinutes ?? 0,
  }
}

// Lunes 2024-01-01 (UTC) es weekday 1.
const req = {
  skillId: HVAC,
  minLevel: "mid" as const,
  zoneId: ZONE,
  durationMinutes: 120,
  fromDate: "2024-01-01",
  fromMinute: 0,
  horizonDays: 7,
}

describe("selectDispatch", () => {
  it("elige al técnico elegible y le encuentra un slot", () => {
    const { chosen } = selectDispatch([tech({})], req)
    expect(chosen?.technicianId).toBe("t-1")
    expect(chosen?.slot).not.toBeNull()
    expect(chosen?.reasons.skill).toBe(true)
  })

  it("descarta por skill insuficiente con razón explícita", () => {
    const { chosen, discarded } = selectDispatch(
      [tech({ skills: [{ skillId: HVAC, level: "junior" }] })],
      { ...req, minLevel: "senior" },
    )
    expect(chosen).toBeNull()
    expect(discarded[0].reasons.skill).toBe(false)
  })

  it("prefiere el slot más temprano entre dos elegibles", () => {
    const ocupado = tech({
      technicianId: "t-busy",
      technicianName: "Beto",
      busy: [{ date: "2024-01-01", startMinute: 480, endMinute: 720 }],
    })
    const libre = tech({ technicianId: "t-free", technicianName: "Carla" })
    const { chosen } = selectDispatch([ocupado, libre], req)
    expect(chosen?.technicianId).toBe("t-free")
  })

  it("desempata por menor carga del día", () => {
    const cargado = tech({ technicianId: "t-load", technicianName: "Aaa", dayAssignmentCount: 3 })
    const liviano = tech({ technicianId: "t-light", technicianName: "Zzz", dayAssignmentCount: 0 })
    const { chosen } = selectDispatch([cargado, liviano], req)
    expect(chosen?.technicianId).toBe("t-light")
  })

  it("no elige a un técnico inactivo", () => {
    const { chosen, discarded } = selectDispatch([tech({ status: "inactive" })], req)
    expect(chosen).toBeNull()
    expect(discarded[0].reasons.status).toBe(false)
  })
})
