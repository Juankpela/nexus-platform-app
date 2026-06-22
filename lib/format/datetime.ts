export const APP_TIME_ZONE = "America/Bogota"

const APP_LOCALE = "es-CO"

type DateInput = string | number | Date | null | undefined

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

/**
 * Una fecha-solo "YYYY-MM-DD" (p. ej. issue_date / payment_date de `date` en
 * Postgres) no tiene hora ni zona. Si la pasamos por `new Date(...)` se asume
 * medianoche UTC y al renderizar en Bogotá (UTC-5) retrocede al día anterior.
 * Para esos valores formateamos desde los componentes, sin conversión de zona.
 */
function parseDateOnly(value: DateInput): { y: number; m: number; d: number } | null {
  if (typeof value !== "string") return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

const MONTHS_SHORT_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]

const DATE_TIME_DEFAULTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}

const DATE_DEFAULTS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
}

const TIME_DEFAULTS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
}

/** Fecha + hora en la zona horaria de la app (America/Bogota). */
export function formatDateTime(value: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  const date = toValidDate(value)
  if (!date) return "—"
  return date.toLocaleString(APP_LOCALE, { ...DATE_TIME_DEFAULTS, ...opts, timeZone: APP_TIME_ZONE })
}

/** Solo fecha en la zona horaria de la app (America/Bogota). */
export function formatDate(value: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  const dateOnly = parseDateOnly(value)
  if (dateOnly) return `${dateOnly.d} ${MONTHS_SHORT_ES[dateOnly.m - 1]} ${dateOnly.y}`
  const date = toValidDate(value)
  if (!date) return "—"
  return date.toLocaleDateString(APP_LOCALE, { ...DATE_DEFAULTS, ...opts, timeZone: APP_TIME_ZONE })
}

/** Solo fecha en formato numérico colombiano DD/MM/YYYY (America/Bogota). */
export function formatDateNumeric(value: DateInput): string {
  const dateOnly = parseDateOnly(value)
  if (dateOnly) {
    const dd = String(dateOnly.d).padStart(2, "0")
    const mm = String(dateOnly.m).padStart(2, "0")
    return `${dd}/${mm}/${dateOnly.y}`
  }
  const date = toValidDate(value)
  if (!date) return "—"
  return date.toLocaleDateString(APP_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  })
}

/** Solo hora en la zona horaria de la app (America/Bogota). */
export function formatTime(value: DateInput, opts?: Intl.DateTimeFormatOptions): string {
  const date = toValidDate(value)
  if (!date) return "—"
  return date.toLocaleTimeString(APP_LOCALE, { ...TIME_DEFAULTS, ...opts, timeZone: APP_TIME_ZONE })
}

/**
 * Fecha de HOY en la zona de la app como "YYYY-MM-DD". Fuente única para el cálculo
 * de "qué día es hoy para el tenant" (vencimientos, SLA, facturación), que estaba
 * copiado como `new Date().toLocaleDateString("en-CA", { timeZone })` en varios sitios.
 */
export function todayInAppZone(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE })
}
