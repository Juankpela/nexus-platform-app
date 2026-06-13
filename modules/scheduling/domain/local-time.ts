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
