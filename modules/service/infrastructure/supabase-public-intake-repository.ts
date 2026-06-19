import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { computeSlaDueAt } from "@/modules/service/domain/sla"
import type { UUID } from "@/types/shared"

/**
 * Public work intake. Anonymous reporters (citizens, residents, supervisors)
 * submit a "novedad" that becomes a tracked Case in the tenant's queue. Security
 * is the tenant slug in the URL (public report form) + service-role scoped to
 * that tenant. No auth, no tenant context. created_by/owner_id are nullable, so
 * an anonymous report needs no user.
 */

export type PublicReportTarget = { tenantId: UUID; tenantName: string }

export type PublicReportInput = {
  description: string
  location: string
  category: string
  reporterName: string
  reporterPhone: string | null
  /** Email opcional para confirmar la visita (Hito D). */
  reporterEmail?: string | null
  /** Foto comprimida en el cliente, como data URL `data:image/jpeg;base64,...`. */
  photoDataUrl?: string | null
}

const REPORTS_BUCKET = "reports"

/** Sube la foto (si viene) al bucket público y devuelve su URL, o null. */
async function uploadReportPhoto(
  tenantId: UUID,
  photoDataUrl: string | null | undefined,
): Promise<string | null> {
  if (!photoDataUrl) return null
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(photoDataUrl)
  if (!match) return null
  const [, contentType, b64] = match
  const ext = contentType.split("/")[1] === "png" ? "png" : contentType.split("/")[1] === "webp" ? "webp" : "jpg"
  const bytes = Buffer.from(b64, "base64")
  if (bytes.byteLength > 5_242_880) return null // 5MB tope defensivo

  const admin = createAdminSupabaseClient()
  const path = `${tenantId}/${crypto.randomUUID()}.${ext}`
  const { error } = await admin.storage
    .from(REPORTS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false })
  if (error) return null // la foto es opcional: no bloquea el reporte
  return admin.storage.from(REPORTS_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Resolve the tenant a public report link points to. Null = invalid link. */
export async function getPublicReportTarget(
  slug: string,
): Promise<PublicReportTarget | null> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle()
  if (error || !data) return null
  return { tenantId: data.id, tenantName: data.name }
}

/** Create a Case (origin "web") from a public report. Returns its number + token. */
export async function submitPublicReport(
  slug: string,
  input: PublicReportInput,
): Promise<{ caseNumber: string; trackingToken: string } | null> {
  const target = await getPublicReportTarget(slug)
  if (!target) return null

  const admin = createAdminSupabaseClient()
  const { data: caseNumber, error: numErr } = await admin.rpc(
    "next_case_number",
    { p_tenant_id: target.tenantId },
  )
  if (numErr || !caseNumber) throw new Error("No se pudo generar el folio.")

  const photoUrl = await uploadReportPhoto(target.tenantId, input.photoDataUrl)

  // Token de seguimiento: lo generamos aquí para devolverlo de inmediato (la BD
  // también tiene un default, pero queremos el valor sin un segundo viaje).
  const trackingToken = crypto.randomUUID()

  const subject = `${input.category}: ${input.description}`.slice(0, 200)
  const description = [
    input.description,
    `Dónde: ${input.location}`,
    `Categoría: ${input.category}`,
    `Reportado por: ${input.reporterName}${input.reporterPhone ? ` — WhatsApp ${input.reporterPhone}` : ""}`,
    ...(photoUrl ? [`Foto: ${photoUrl}`] : []),
  ].join("\n")

  const { error: insErr } = await admin.from("cases").insert({
    tenant_id: target.tenantId,
    case_number: caseNumber as string,
    subject,
    description,
    priority: "medium",
    origin: "web",
    reporter_email: input.reporterEmail ?? null,
    tracking_token: trackingToken,
    sla_due_at: computeSlaDueAt(new Date().toISOString(), "medium"),
  } as never)
  if (insErr) throw new Error("No se pudo registrar el reporte.")

  return { caseNumber: caseNumber as string, trackingToken }
}
