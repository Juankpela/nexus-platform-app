import type { UUID } from "@/types/shared"

/** 0=domingo … 6=sábado (JS Date.getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0] // Lun→Dom para la UI

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

/** Recurring weekly window — wall-clock minutes from LOCAL midnight (tz at eval, PR4). */
export type WeeklyWindow = {
  id: UUID
  weekday: Weekday
  startMinute: number
  endMinute: number
  createdAt: string
  updatedAt: string
}

export type WeeklyWindowInput = {
  weekday: Weekday
  startMinute: number
  endMinute: number
}

export const EXCEPTION_KINDS = [
  "vacation",
  "sick",
  "permit",
  "holiday",
  "manual_block",
] as const
export type ExceptionKind = (typeof EXCEPTION_KINDS)[number]

export const EXCEPTION_KIND_LABELS: Record<ExceptionKind, string> = {
  vacation: "Vacaciones",
  sick: "Incapacidad",
  permit: "Permiso",
  holiday: "Festivo",
  manual_block: "Bloqueo manual",
}

/** A blocking exception. Full-day when minutes are null. Always overrides windows. */
export type AvailabilityException = {
  id: UUID
  dateFrom: string
  dateTo: string
  startMinute: number | null
  endMinute: number | null
  kind: ExceptionKind
  note: string | null
  createdAt: string
  updatedAt: string
}

export type AvailabilityExceptionInput = {
  dateFrom: string
  dateTo: string
  startMinute: number | null
  endMinute: number | null
  kind: ExceptionKind
  note: string | null
}

export type TechnicianCapacity = {
  maxWorkOrdersPerDay: number | null
  maxMinutesPerDay: number | null
}

// ── Pure helpers (no I/O) ────────────────────────────────────────────────────

/** "HH:MM" → minutes from midnight, or null if malformed/out of range. */
export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** minutes from midnight → "HH:MM" (1440 → "24:00"). */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** A window is valid when it stays within the day and end is strictly after start. */
export function isValidWindow(startMinute: number, endMinute: number): boolean {
  return (
    Number.isInteger(startMinute) &&
    Number.isInteger(endMinute) &&
    startMinute >= 0 &&
    startMinute <= 1439 &&
    endMinute >= 1 &&
    endMinute <= 1440 &&
    endMinute > startMinute
  )
}

export function isWeekday(value: number): value is Weekday {
  return Number.isInteger(value) && value >= 0 && value <= 6
}
