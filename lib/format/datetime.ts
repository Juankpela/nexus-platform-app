export const APP_TIME_ZONE = "America/Bogota"

const APP_LOCALE = "es-CO"

type DateInput = string | number | Date | null | undefined

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

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
  const date = toValidDate(value)
  if (!date) return "—"
  return date.toLocaleDateString(APP_LOCALE, { ...DATE_DEFAULTS, ...opts, timeZone: APP_TIME_ZONE })
}

/** Solo fecha en formato numérico colombiano DD/MM/YYYY (America/Bogota). */
export function formatDateNumeric(value: DateInput): string {
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
