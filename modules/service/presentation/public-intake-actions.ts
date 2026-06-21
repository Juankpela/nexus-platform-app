"use server"

import { submitPublicReport } from "@/modules/service/composition"
import { geocodeServiceAddress } from "@/modules/service/infrastructure/google-geocoding"

export type PublicReportState =
  | { ok: false; error: string | null }
  | { ok: true; folio: string; trackingToken: string }

function field(form: FormData, name: string): string {
  const v = form.get(name)
  return typeof v === "string" ? v.trim() : ""
}

/**
 * Public, no-login work intake. Anyone with the report link can submit a
 * novedad; it becomes a tracked Case in the tenant's queue. Security is the
 * tenant slug + service-role scoped to that tenant; a honeypot field filters
 * trivial bots. Returns a citizen-facing folio (REP-...).
 */
export async function submitReportAction(
  _state: PublicReportState,
  formData: FormData,
): Promise<PublicReportState> {
  // Honeypot: real users never fill this hidden field. Devolvemos un éxito falso
  // (sin token real) para no darle señal al bot.
  if (field(formData, "website")) return { ok: true, folio: "REP-OK", trackingToken: "" }

  const slug = field(formData, "tenantSlug")
  const description = field(formData, "description")
  const location = field(formData, "location")
  // Paso 1 — categoría: id de skill, o "otro". Paso 2 — tipo de daño (id de
  // service_issue_types, entidad estructurada). El valor "otro" no es un id.
  const categoryId = field(formData, "categoryId")
  const issueTypeRaw = field(formData, "issueTypeId")
  const issueTypeId = issueTypeRaw && issueTypeRaw !== "otro" ? issueTypeRaw : null
  const reportedSkillId = categoryId && categoryId !== "otro" ? categoryId : null
  const reporterName = field(formData, "reporterName")
  const reporterPhone = field(formData, "reporterPhone")
  const reporterEmailRaw = field(formData, "reporterEmail")
  const reporterEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmailRaw)
    ? reporterEmailRaw
    : null
  const photoDataUrl = field(formData, "photo")
  // Coordenadas GPS del cliente (camino A — "estoy en el lugar del reporte").
  // OJO: field() devuelve "" cuando el hidden viene vacío (camino manual / GPS
  // denegado) y Number("") === 0, lo que haría pasar (0,0) como coords válidas.
  // Por eso exigimos que los crudos NO estén vacíos antes de interpretarlos.
  const latRaw = field(formData, "service_lat")
  const lngRaw = field(formData, "service_lng")
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  const hasGps =
    !!latRaw && !!lngRaw &&
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

  if (!slug) return { ok: false, error: "Enlace inválido." }
  if (!categoryId) return { ok: false, error: "Elige una categoría." }
  // La descripción es opcional cuando hay categoría; obligatoria en "Otro".
  if (!reportedSkillId && !description) {
    return { ok: false, error: "Cuéntanos qué ocurrió." }
  }
  if (!reporterName) return { ok: false, error: "Déjanos tu nombre." }
  // El correo es obligatorio: es el canal por el que confirmamos la visita y
  // avisamos que el técnico va en camino. Sin él, ambas notificaciones se omiten.
  if (!reporterEmailRaw) return { ok: false, error: "Déjanos tu correo para confirmarte la visita." }
  if (!reporterEmail) return { ok: false, error: "El correo no parece válido. Revísalo, por favor." }

  // Resolución del destino del ETA — BEST-EFFORT, NUNCA bloquea. Principio rector:
  // un caso siempre puede crearse; el ETA es una capacidad adicional.
  //   A) GPS del reportante  → location_source='gps'
  //   B) dirección escrita   → Geocoding (bias CO) → 'geocoded'; si falla → 'manual'
  //                            (se guarda la dirección como texto, sin coords).
  let serviceLat: number | null = null
  let serviceLng: number | null = null
  let serviceAddress: string | null = null
  let locationSource: "gps" | "geocoded" | "manual" | null = null

  if (hasGps) {
    serviceLat = lat
    serviceLng = lng
    serviceAddress = location || null
    locationSource = "gps"
  } else if (location) {
    const geo = await geocodeServiceAddress(location)
    if (geo) {
      serviceLat = geo.lat
      serviceLng = geo.lng
      serviceAddress = geo.formattedAddress || location
      locationSource = "geocoded"
    } else {
      // Geocoding falló: NO bloqueamos. Guardamos la dirección como texto.
      serviceAddress = location
      locationSource = "manual"
    }
  }

  try {
    const result = await submitPublicReport(slug, {
      description,
      location,
      reportedSkillId,
      issueTypeId,
      reporterName,
      reporterPhone: reporterPhone || null,
      reporterEmail,
      photoDataUrl: photoDataUrl || null,
      serviceLat,
      serviceLng,
      serviceAddress,
      locationSource,
    })
    if (!result) return { ok: false, error: "Enlace inválido." }
    const folio = result.caseNumber.replace(/^CASE/i, "REP")
    return { ok: true, folio, trackingToken: result.trackingToken }
  } catch {
    return { ok: false, error: "No se pudo enviar el reporte. Inténtalo de nuevo." }
  }
}
