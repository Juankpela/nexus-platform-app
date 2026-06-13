import {
  meetsSkillLevel,
  type SkillLevel,
} from "@/modules/service/domain/skill"
import type {
  AvailabilityException,
  Weekday,
  WeeklyWindow,
  TechnicianCapacity,
} from "@/modules/service/domain/availability"
import type { TechnicianStatus } from "@/modules/service/domain/technician"
import type { UUID } from "@/types/shared"

/**
 * Deterministic, PURE technician eligibility (PR4, ADR-028). No I/O, no scoring,
 * no automation — just hard boolean filters in AND. The resolver assembles a
 * TechnicianCapability snapshot from PR3 (skills/zones/availability/capacity) and
 * scheduling (assignments/overlap) and runs this. Timezone is injected so the
 * single config point (default America/Bogota) lives in the resolver, not here.
 */

export type EligibilityRequirement = {
  skillId: UUID | null
  minLevel: SkillLevel | null
  zoneId: UUID | null
  startsAt: string
  endsAt: string
}

export type TechnicianCapability = {
  technicianId: UUID
  technicianName: string
  status: TechnicianStatus
  skills: { skillId: UUID; level: SkillLevel }[]
  zoneIds: UUID[]
  windows: WeeklyWindow[]
  exceptions: AvailabilityException[]
  capacity: TechnicianCapacity
  dayAssignmentCount: number
  dayScheduledMinutes: number
  /** Active assignment overlapping the requested window (from findOverlapping). */
  hasOverlap: boolean
}

export type EligibilityReasons = {
  status: boolean
  skill: boolean
  zone: boolean
  availability: boolean
  capacity: boolean
  noOverlap: boolean
}

export type EligibilityResult = {
  technicianId: UUID
  technicianName: string
  eligible: boolean
  reasons: EligibilityReasons
  dayAssignmentCount: number
}

/** Local wall-clock projection of an instant in a timezone. */
export type LocalWindow = {
  date: string // YYYY-MM-DD
  weekday: Weekday
  startMinute: number
  endMinute: number
}

const pad = (n: number) => String(n).padStart(2, "0")

function localParts(iso: string, timeZone: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  const year = Number(get("year"))
  const month = Number(get("month"))
  const day = Number(get("day"))
  let hour = Number(get("hour"))
  const minute = Number(get("minute"))
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  if (hour === 24) hour = 0 // some runtimes emit "24" for midnight
  return { year, month, day, minute: hour * 60 + minute }
}

/**
 * Project a requested [startsAt, endsAt) instant range into a single local day's
 * wall-clock window. Returns null if unparseable or if it spans local days
 * (overnight requests are not coverable — windows are per-day, ADR-027).
 */
export function resolveLocalWindow(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): LocalWindow | null {
  const s = localParts(startsAt, timeZone)
  const e = localParts(endsAt, timeZone)
  if (!s || !e) return null
  const sDate = `${s.year}-${pad(s.month)}-${pad(s.day)}`
  const eDate = `${e.year}-${pad(e.month)}-${pad(e.day)}`
  if (sDate !== eDate) return null
  const weekday = new Date(Date.UTC(s.year, s.month - 1, s.day)).getUTCDay() as Weekday
  return { date: sDate, weekday, startMinute: s.minute, endMinute: e.minute }
}

/** Half-open overlap. */
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** True when the local window fits inside a weekly window and no exception blocks it. */
export function isWithinAvailability(
  windows: WeeklyWindow[],
  exceptions: AvailabilityException[],
  local: LocalWindow,
): boolean {
  const covered = windows.some(
    (w) =>
      w.weekday === local.weekday &&
      w.startMinute <= local.startMinute &&
      w.endMinute >= local.endMinute,
  )
  if (!covered) return false
  const blocked = exceptions.some((ex) => {
    if (local.date < ex.dateFrom || local.date > ex.dateTo) return false
    if (ex.startMinute === null || ex.endMinute === null) return true // full day
    return rangesOverlap(local.startMinute, local.endMinute, ex.startMinute, ex.endMinute)
  })
  return !blocked
}

/** Daily count + minutes caps (null = no cap). Window-derived time is enforced separately. */
export function meetsCapacity(
  capacity: TechnicianCapacity,
  dayAssignmentCount: number,
  dayScheduledMinutes: number,
  durationMinutes: number,
): boolean {
  const countOk =
    capacity.maxWorkOrdersPerDay === null ||
    dayAssignmentCount + 1 <= capacity.maxWorkOrdersPerDay
  const minutesOk =
    capacity.maxMinutesPerDay === null ||
    dayScheduledMinutes + durationMinutes <= capacity.maxMinutesPerDay
  return countOk && minutesOk
}

export function durationMinutes(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  return ms > 0 ? Math.round(ms / 60000) : 0
}

export function evaluateEligibility(
  requirement: EligibilityRequirement,
  capability: TechnicianCapability,
  timeZone: string,
): EligibilityResult {
  const local = resolveLocalWindow(requirement.startsAt, requirement.endsAt, timeZone)
  const dur = durationMinutes(requirement.startsAt, requirement.endsAt)

  const reasons: EligibilityReasons = {
    status: capability.status === "active",
    skill:
      requirement.skillId === null ||
      capability.skills.some(
        (s) =>
          s.skillId === requirement.skillId &&
          meetsSkillLevel(s.level, requirement.minLevel ?? "junior"),
      ),
    zone: requirement.zoneId === null || capability.zoneIds.includes(requirement.zoneId),
    availability:
      local !== null && isWithinAvailability(capability.windows, capability.exceptions, local),
    capacity: meetsCapacity(
      capability.capacity,
      capability.dayAssignmentCount,
      capability.dayScheduledMinutes,
      dur,
    ),
    noOverlap: !capability.hasOverlap,
  }

  const eligible = Object.values(reasons).every(Boolean)
  return {
    technicianId: capability.technicianId,
    technicianName: capability.technicianName,
    eligible,
    reasons,
    dayAssignmentCount: capability.dayAssignmentCount,
  }
}

/** Deterministic, NON-weighted order: lighter day-load first, then name. */
export function sortEligible(results: EligibilityResult[]): EligibilityResult[] {
  return [...results].sort(
    (a, b) =>
      a.dayAssignmentCount - b.dayAssignmentCount ||
      a.technicianName.localeCompare(b.technicianName),
  )
}
