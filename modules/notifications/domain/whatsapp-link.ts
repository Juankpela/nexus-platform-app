/**
 * Entrega por WhatsApp — Nivel 1 (enlaces "click-to-send" wa.me).
 *
 * Funciones PURAS: normalizan el teléfono del cliente, arman el enlace wa.me con
 * el mensaje pre-escrito y redactan los mensajes de cada momento (confirmación,
 * en camino, completado). Sin red, sin proveedor: el coordinador/técnico abre el
 * enlace y envía desde su propio WhatsApp. La automatización (proveedor/Meta) es
 * un nivel posterior que reusa estos mensajes a través de CommunicationChannel.
 */

/** Indicativo por defecto (Colombia). Configurable a futuro por tenant. */
const DEFAULT_COUNTRY_CODE = "57"
/** Longitud de un móvil colombiano local sin indicativo (3XX XXX XXXX). */
const CO_LOCAL_MOBILE_LENGTH = 10

/**
 * Normaliza un teléfono a solo dígitos con indicativo de país, apto para wa.me.
 * Reglas conservadoras:
 *  - Quita todo lo que no sea dígito (espacios, +, guiones, paréntesis, texto).
 *  - Si ya trae indicativo de país (≥ 11 dígitos), se respeta tal cual.
 *  - Si son 10 dígitos (móvil CO local), antepone el indicativo por defecto.
 * Devuelve null si no hay dígitos suficientes para ser un número válido.
 */
export function normalizePhone(
  raw: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, "")
  if (digits.length < CO_LOCAL_MOBILE_LENGTH) return null
  if (digits.length === CO_LOCAL_MOBILE_LENGTH) return `${countryCode}${digits}`
  return digits
}

/**
 * Arma el enlace wa.me con el mensaje pre-escrito. Devuelve null si el teléfono
 * no es utilizable (así la UI puede mostrar el botón deshabilitado con motivo).
 */
export function buildWhatsAppUrl(
  rawPhone: string | null | undefined,
  message: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  const phone = normalizePhone(rawPhone, countryCode)
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/** Datos compartidos para redactar el mensaje al cliente. */
export type WhatsAppMessageContext = {
  /** Nombre del técnico asignado (o null). */
  technicianName: string | null
  /** Asunto / descripción corta de la solicitud. */
  caseSubject: string
  /** Número de la orden de trabajo (ej. "WO-2026-0021"). */
  workOrderNumber: string | null
  /** Horario legible ya formateado (ej. "viernes 20 de junio, 3:30 p.m."). */
  whenText: string | null
  /** URL pública de seguimiento (o null si no hay token). */
  trackingUrl: string | null
  /** ETA real (Fase 3): minutos estimados de llegada. Null = sin ETA. */
  etaMinutes?: number | null
  /** Hora de llegada estimada ya formateada (ej. "9:48 a. m."). */
  arrivalText?: string | null
}

function trackingLine(ctx: WhatsAppMessageContext): string {
  return ctx.trackingUrl ? `\n\nSiga el estado en tiempo real aquí: ${ctx.trackingUrl}` : ""
}

function orderRef(ctx: WhatsAppMessageContext): string {
  return ctx.workOrderNumber ? ` (orden ${ctx.workOrderNumber})` : ""
}

/** Confirmación de visita agendada. */
export function confirmationMessage(ctx: WhatsAppMessageContext): string {
  const tech = ctx.technicianName ? ` con el técnico ${ctx.technicianName}` : ""
  const when = ctx.whenText ? ` para el ${ctx.whenText}` : ""
  return (
    `Hola 👋 Confirmamos su visita${when}${tech} por su solicitud "${ctx.caseSubject}"${orderRef(ctx)}.` +
    trackingLine(ctx)
  )
}

/** Línea de ETA real (Fase 3), o vacío si no hay ETA. */
function etaLine(ctx: WhatsAppMessageContext): string {
  if (ctx.etaMinutes == null) return ""
  const arrival = ctx.arrivalText ? ` (aprox. ${ctx.arrivalText})` : ""
  return `\n\nTiempo estimado de llegada: ~${ctx.etaMinutes} min${arrival}.`
}

/** Aviso de que el técnico va en camino. */
export function enRouteMessage(ctx: WhatsAppMessageContext): string {
  const tech = ctx.technicianName ?? "Su técnico asignado"
  return (
    `Hola 👋 ${tech} va en camino para atender su solicitud "${ctx.caseSubject}"${orderRef(ctx)}.` +
    etaLine(ctx) +
    trackingLine(ctx)
  )
}

/** Aviso de que el técnico llegó al sitio. */
export function arrivedMessage(ctx: WhatsAppMessageContext): string {
  const tech = ctx.technicianName ?? "Su técnico asignado"
  return (
    `Hola 👋 ${tech} llegó al sitio para atender su solicitud "${ctx.caseSubject}"${orderRef(ctx)}.` +
    trackingLine(ctx)
  )
}

/** Aviso de trabajo completado. */
export function completedMessage(ctx: WhatsAppMessageContext): string {
  return (
    `Hola 👋 El trabajo de su solicitud "${ctx.caseSubject}"${orderRef(ctx)} quedó completado. ` +
    `¡Gracias por confiar en nosotros!` +
    trackingLine(ctx)
  )
}

/**
 * Enlaces wa.me listos por momento de la operación (o null si el teléfono no es
 * utilizable). Permite a la UI mostrar, en cada paso, SOLO el aviso que toca —
 * sin que el técnico tenga que elegir entre varios y arriesgar enviar el equivocado.
 */
export function notifyLinks(
  ctx: WhatsAppMessageContext,
  rawPhone: string | null | undefined,
): {
  confirm: string | null
  enRoute: string | null
  arrived: string | null
  completed: string | null
} {
  return {
    confirm: buildWhatsAppUrl(rawPhone, confirmationMessage(ctx)),
    enRoute: buildWhatsAppUrl(rawPhone, enRouteMessage(ctx)),
    arrived: buildWhatsAppUrl(rawPhone, arrivedMessage(ctx)),
    completed: buildWhatsAppUrl(rawPhone, completedMessage(ctx)),
  }
}
