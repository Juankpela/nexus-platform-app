/**
 * Project an instant into a timezone's local date + minute-of-day. Used by the
 * reschedule engine to express "now" and existing assignments in the local
 * wall-clock terms that findNextSlot works in. Deterministic (Intl); no clock.
 */
const pad = (n: number) => String(n).padStart(2, "0")

export function localDateMinute(
  iso: string,
  timeZone: string,
): { date: string; minute: number } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  const year = Number(get("year"))
  const month = Number(get("month"))
  const day = Number(get("day"))
  let hour = Number(get("hour"))
  const minute = Number(get("minute"))
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  if (hour === 24) hour = 0
  return { date: `${year}-${pad(month)}-${pad(day)}`, minute: hour * 60 + minute }
}

/** Offset (minutes) of a timezone from UTC at a given instant. */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  let hour = Number(parts.hour)
  if (hour === 24) hour = 0
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return (asUtc - instant.getTime()) / 60_000
}

/** Convert a local wall-clock slot (date + minute-of-day in `timeZone`) to a UTC ISO instant. */
export function localSlotToIso(date: string, minute: number, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number)
  const guess = new Date(Date.UTC(y, mo - 1, d))
  const offset = zoneOffsetMinutes(guess, timeZone)
  return new Date(Date.UTC(y, mo - 1, d) + minute * 60_000 - offset * 60_000).toISOString()
}
