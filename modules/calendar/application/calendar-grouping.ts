// Calendar is a pure VIEW layer over Scheduling's WorkOrderAssignment.
// No new domain, no new repository, no new tables: only deterministic grouping
// and filtering helpers consumed by the presentation layer.
//
// All bucketing uses UTC (getUTCHours/getUTCDay) so it is timezone-deterministic
// and matches the UTC day windows used by Dispatch. Per-tenant timezone is a
// future enhancement (see ADR-017).

import type {
  AssignmentStatus,
  WorkOrderAssignment,
} from "@/modules/scheduling/domain/work-order-assignment"
import type { UUID } from "@/types/shared"

/** Business hours shown in the day grid. */
export const DAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

export const WEEKDAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
]

export type CalendarFilters = {
  technicianId?: UUID | null
  status?: AssignmentStatus | null
  fromIso?: string | null
  toIso?: string | null
}

/** Pure filter by technician, status and [from, to) scheduled_start window. */
export function filterAssignments(
  items: WorkOrderAssignment[],
  opts: CalendarFilters,
): WorkOrderAssignment[] {
  return items.filter((a) => {
    if (opts.technicianId && a.technicianId !== opts.technicianId) return false
    if (opts.status && a.status !== opts.status) return false
    const start = new Date(a.scheduledStart).getTime()
    if (opts.fromIso && start < new Date(opts.fromIso).getTime()) return false
    if (opts.toIso && start >= new Date(opts.toIso).getTime()) return false
    return true
  })
}

export type HourBucket = { hour: number; items: WorkOrderAssignment[] }

/** Day view — group by the UTC start hour, one bucket per business hour. */
export function groupByHour(
  items: WorkOrderAssignment[],
  hours: number[] = DAY_HOURS,
): HourBucket[] {
  return hours.map((hour) => ({
    hour,
    items: items.filter((a) => new Date(a.scheduledStart).getUTCHours() === hour),
  }))
}

/** Monday 00:00 UTC of the week containing the given YYYY-MM-DD date. */
export function startOfWeekUtc(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  const mondayOffset = (d.getUTCDay() + 6) % 7 // 0=Sun → 6, 1=Mon → 0
  return new Date(d.getTime() - mondayOffset * 86_400_000)
}

export type DayBucket = {
  /** YYYY-MM-DD */
  date: string
  /** 0 = Monday … 6 = Sunday */
  weekdayIndex: number
  label: string
  items: WorkOrderAssignment[]
}

/** Week view — 7 buckets Monday→Sunday relative to weekStart (UTC). */
export function groupByWeekday(
  items: WorkOrderAssignment[],
  weekStart: Date,
): DayBucket[] {
  const buckets: DayBucket[] = WEEKDAY_LABELS.map((label, i) => {
    const day = new Date(weekStart.getTime() + i * 86_400_000)
    return {
      date: day.toISOString().slice(0, 10),
      weekdayIndex: i,
      label,
      items: [],
    }
  })

  for (const a of items) {
    const start = new Date(a.scheduledStart).getTime()
    const idx = Math.floor((start - weekStart.getTime()) / 86_400_000)
    if (idx >= 0 && idx < 7) buckets[idx].items.push(a)
  }
  return buckets
}

export type TechnicianGroup = {
  technicianId: UUID
  technicianName: string | null
  items: WorkOrderAssignment[]
}

/** Technician view — group by technician, sorted by name then by start time. */
export function groupByTechnician(
  items: WorkOrderAssignment[],
): TechnicianGroup[] {
  const map = new Map<UUID, TechnicianGroup>()
  for (const a of items) {
    const group = map.get(a.technicianId) ?? {
      technicianId: a.technicianId,
      technicianName: a.technicianName,
      items: [],
    }
    group.items.push(a)
    map.set(a.technicianId, group)
  }
  const groups = [...map.values()]
  for (const g of groups) {
    g.items.sort(
      (x, y) =>
        new Date(x.scheduledStart).getTime() - new Date(y.scheduledStart).getTime(),
    )
  }
  groups.sort((a, b) =>
    (a.technicianName ?? "").localeCompare(b.technicianName ?? ""),
  )
  return groups
}
