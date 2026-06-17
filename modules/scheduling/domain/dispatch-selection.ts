import {
  meetsCapacity,
  type EligibilityReasons,
} from "@/modules/scheduling/domain/eligibility"
import { findNextSlot, type LocalSlot } from "@/modules/scheduling/domain/next-slot"
import { meetsSkillLevel, type SkillLevel } from "@/modules/service/domain/skill"
import type {
  AvailabilityException,
  TechnicianCapacity,
  WeeklyWindow,
} from "@/modules/service/domain/availability"
import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { BusyInterval } from "@/modules/scheduling/domain/next-slot"
import type { UUID } from "@/types/shared"

/**
 * Selección PURA y determinística del técnico + horario para el despacho
 * autónomo (ADR-033). Reutiliza las reglas existentes: `meetsSkillLevel`,
 * `meetsCapacity` y `findNextSlot`. NO escribe, NO usa IA, NO pondera de forma
 * opaca: filtros duros + "primer slot más temprano", desempate por carga del día
 * y nombre (igual criterio que `sortEligible`).
 *
 * El llamador (use-case) proyecta los assignments del técnico a `busy` locales
 * (reusando el patrón de plan-reschedule) antes de invocar.
 */

export type TechnicianDispatchSnapshot = {
  technicianId: UUID
  technicianName: string
  status: TechnicianStatus
  skills: { skillId: UUID; level: SkillLevel }[]
  zoneIds: UUID[]
  windows: WeeklyWindow[]
  exceptions: AvailabilityException[]
  busy: BusyInterval[]
  capacity: TechnicianCapacity
  dayAssignmentCount: number
  dayScheduledMinutes: number
}

export type DispatchRequirement = {
  skillId: UUID | null
  minLevel: SkillLevel | null
  zoneId: UUID | null
  durationMinutes: number
  /** Búsqueda de slot desde (local). */
  fromDate: string
  fromMinute: number
  horizonDays: number
}

export type DispatchCandidate = {
  technicianId: UUID
  technicianName: string
  reasons: EligibilityReasons
  /** Slot local encontrado (null si no hay). */
  slot: LocalSlot | null
  dayAssignmentCount: number
}

export type DispatchSelection = {
  chosen: DispatchCandidate | null
  discarded: DispatchCandidate[]
}

/** Filtros estáticos (no dependen del slot): status, skill, zona, capacidad. */
function staticReasons(
  snap: TechnicianDispatchSnapshot,
  req: DispatchRequirement,
): Pick<EligibilityReasons, "status" | "skill" | "zone" | "capacity"> {
  return {
    status: snap.status === "active",
    skill:
      req.skillId === null ||
      snap.skills.some(
        (s) => s.skillId === req.skillId && meetsSkillLevel(s.level, req.minLevel ?? "junior"),
      ),
    zone: req.zoneId === null || snap.zoneIds.includes(req.zoneId),
    capacity: meetsCapacity(
      snap.capacity,
      snap.dayAssignmentCount,
      snap.dayScheduledMinutes,
      req.durationMinutes,
    ),
  }
}

function earlier(a: LocalSlot, b: LocalSlot): boolean {
  return a.date < b.date || (a.date === b.date && a.startMinute < b.startMinute)
}

export function selectDispatch(
  snapshots: TechnicianDispatchSnapshot[],
  req: DispatchRequirement,
): DispatchSelection {
  const candidates: DispatchCandidate[] = snapshots.map((snap) => {
    const sr = staticReasons(snap, req)
    const staticOk = sr.status && sr.skill && sr.zone && sr.capacity

    // El slot solo se busca si pasa los filtros estáticos. Encontrar un slot
    // implica disponibilidad (ventana libre) y sin solape con su agenda.
    const slot = staticOk
      ? findNextSlot({
          windows: snap.windows,
          busy: snap.busy,
          exceptions: snap.exceptions,
          durationMinutes: req.durationMinutes,
          fromDate: req.fromDate,
          fromMinute: req.fromMinute,
          horizonDays: req.horizonDays,
        })
      : null

    return {
      technicianId: snap.technicianId,
      technicianName: snap.technicianName,
      reasons: {
        ...sr,
        availability: slot !== null,
        noOverlap: slot !== null,
      },
      slot,
      dayAssignmentCount: snap.dayAssignmentCount,
    }
  })

  const eligible = candidates.filter((c) => c.slot !== null && allTrue(c.reasons))

  // Más temprano primero; desempate determinístico: menor carga, luego nombre.
  const chosen =
    eligible.length === 0
      ? null
      : [...eligible].sort((a, b) => {
          if (earlier(a.slot as LocalSlot, b.slot as LocalSlot)) return -1
          if (earlier(b.slot as LocalSlot, a.slot as LocalSlot)) return 1
          return (
            a.dayAssignmentCount - b.dayAssignmentCount ||
            a.technicianName.localeCompare(b.technicianName)
          )
        })[0]

  const discarded = candidates.filter((c) => c.technicianId !== chosen?.technicianId)
  return { chosen, discarded }
}

function allTrue(r: EligibilityReasons): boolean {
  return Object.values(r).every(Boolean)
}
