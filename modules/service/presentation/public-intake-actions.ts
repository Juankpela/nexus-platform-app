"use server"

import { submitPublicReport } from "@/modules/service/composition"

export type PublicReportState =
  | { ok: false; error: string | null }
  | { ok: true; folio: string }

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
  // Honeypot: real users never fill this hidden field.
  if (field(formData, "website")) return { ok: true, folio: "REP-OK" }

  const slug = field(formData, "tenantSlug")
  const description = field(formData, "description")
  const location = field(formData, "location")
  const category = field(formData, "category")
  const reporterName = field(formData, "reporterName")
  const reporterPhone = field(formData, "reporterPhone")
  const photoDataUrl = field(formData, "photo")

  if (!slug) return { ok: false, error: "Enlace inválido." }
  if (!description) return { ok: false, error: "Cuéntanos qué ocurrió." }
  if (!location) return { ok: false, error: "Indícanos dónde ocurrió." }
  if (!reporterName) return { ok: false, error: "Déjanos tu nombre." }

  try {
    const result = await submitPublicReport(slug, {
      description,
      location,
      category: category || "Otro",
      reporterName,
      reporterPhone: reporterPhone || null,
      photoDataUrl: photoDataUrl || null,
    })
    if (!result) return { ok: false, error: "Enlace inválido." }
    const folio = result.caseNumber.replace(/^CASE/i, "REP")
    return { ok: true, folio }
  } catch {
    return { ok: false, error: "No se pudo enviar el reporte. Inténtalo de nuevo." }
  }
}
