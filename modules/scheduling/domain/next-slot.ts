import type {
  AvailabilityException,
  Weekday,
  WeeklyWindow,
} from "@/modules/service/domain/availability"

/**
 * Pure next-available-slot search (PR5b). Works entirely in LOCAL wall-clock
 * terms (date + minutes), so it needs no timezone math: the caller projects the
 * technician's existing assignments to local `BusyInterval`s (reusing PR4's
 * resolveLocalWindow) and the tenant timezone before calling. The proposal is
 * expressed in local terms — exact UTC conversion happens only at activation
 * (the dry-run shows a human-readable suggestion). No I/O.
 */

export type LocalSlot = {
  date: string
  weekday: Weekday
  startMinute: number
  endMinute: number
}

/** An interval that blocks scheduling, in local terms. */
export type BusyInterval = {
  date: string
  startMinute: number
  endMinute: number
}

const pad = (n: number) => String(n).padStart(2, "0")

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

function weekdayOf(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday
}

/**
 * First start-minute within [windowStart, windowEnd] that is ≥ earliest and
 * leaves room for `duration` without hitting any block. Blocks are intervals
 * overlapping the window. Returns null if no gap fits.
 */
function firstGap(
  windowStart: number,
  windowEnd: number,
  earliest: number,
  blocks: { startMinute: number; endMinute: number }[],
  duration: number,
): number | null {
  let cursor = Math.max(windowStart, earliest)
  const sorted = [...blocks].sort((a, b) => a.startMinute - b.startMinute)
  for (const b of sorted) {
    if (b.endMinute <= cursor) continue // already past
    if (b.startMinute - cursor >= duration) return cursor // gap before this block fits
    cursor = Math.max(cursor, b.endMinute)
  }
  return windowEnd - cursor >= duration ? cursor : null
}

export type FindNextSlotParams = {
  windows: WeeklyWindow[]
  busy: BusyInterval[]
  exceptions: AvailabilityException[]
  durationMinutes: number
  /** Local date to start searching from (inclusive), YYYY-MM-DD. */
  fromDate: string
  /** Earliest minute considered on fromDate (e.g., "now"); later days start at 0. */
  fromMinute: number
  horizonDays: number
}

export function findNextSlot(params: FindNextSlotParams): LocalSlot | null {
  const { windows, busy, exceptions, durationMinutes, fromDate, fromMinute, horizonDays } = params
  if (durationMinutes <= 0) return null

  for (let offset = 0; offset < horizonDays; offset++) {
    const date = addDays(fromDate, offset)
    const weekday = weekdayOf(date)
    const earliest = offset === 0 ? fromMinute : 0

    // Exception-derived blocks for this date (full-day blocks the whole day).
    const exBlocks: { startMinute: number; endMinute: number }[] = []
    let fullDayBlocked = false
    for (const ex of exceptions) {
      if (date < ex.dateFrom || date > ex.dateTo) continue
      if (ex.startMinute === null || ex.endMinute === null) {
        fullDayBlocked = true
        break
      }
      exBlocks.push({ startMinute: ex.startMinute, endMinute: ex.endMinute })
    }
    if (fullDayBlocked) continue

    const dayBusy = busy.filter((b) => b.date === date)
    const blocks = [...dayBusy, ...exBlocks]

    const dayWindows = windows
      .filter((w) => w.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute)

    for (const w of dayWindows) {
      const start = firstGap(w.startMinute, w.endMinute, earliest, blocks, durationMinutes)
      if (start !== null) {
        return { date, weekday, startMinute: start, endMinute: start + durationMinutes }
      }
    }
  }
  return null
}
