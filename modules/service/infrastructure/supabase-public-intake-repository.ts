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
  /** Skill (categoría) elegida — autoritativa para coordinar. Null = "Otro". */
  reportedSkillId?: UUID | null
  /** Tipo de daño estructurado (Paso 2): id de service_issue_types o null. */
  issueTypeId?: UUID | null
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

/** Tipo de daño ofrecido en el Paso 2 — entidad estructurada (service_issue_types). */
export type PublicReportIssueType = { id: UUID; name: string }
/** Categoría operacional del reporte = una skill del tenant + su catálogo de daños. */
export type PublicReportCategory = {
  id: UUID
  name: string
  issueTypes: PublicReportIssueType[]
}

/**
 * Contexto del reporte público guiado (sin login): tenant + sus skills como
 * categorías, cada una con sus tipos de daño ACTIVOS (entidad service_issue_types,
 * no array). Lectura admin: la página pública no tiene auth. Multi-tenant: cada
 * organización ofrece su propio catálogo, sin hardcode ni seeds.
 */
export async function getPublicReportContext(
  slug: string,
): Promise<{ tenantId: UUID; tenantName: string; categories: PublicReportCategory[] } | null> {
  const target = await getPublicReportTarget(slug)
  if (!target) return null
  const admin = createAdminSupabaseClient()

  const [{ data: skillRows }, { data: issueTypeRows }] = await Promise.all([
    admin
      .from("skills")
      .select("id, name")
      .eq("tenant_id", target.tenantId)
      .is("archived_at", null)
      .order("name", { ascending: true }),
    admin
      .from("service_issue_types")
      .select("id, name, skill_id")
      .eq("tenant_id", target.tenantId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
  ])

  const bySkill = new Map<string, PublicReportIssueType[]>()
  for (const it of (issueTypeRows as { id: string; name: string; skill_id: string }[]) ?? []) {
    const bucket = bySkill.get(it.skill_id)
    const entry = { id: it.id, name: it.name }
    if (bucket) bucket.push(entry)
    else bySkill.set(it.skill_id, [entry])
  }

  const categories = ((skillRows as { id: string; name: string }[]) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    issueTypes: bySkill.get(s.id) ?? [],
  }))
  return { tenantId: target.tenantId, tenantName: target.tenantName, categories }
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

  // Resuelve el nombre de la skill (categoría) y valida que sea del tenant. Si no
  // existe o no pertenece al tenant, se trata como "Otro" (sin skill autoritativa).
  let skillName: string | null = null
  let reportedSkillId: string | null = null
  if (input.reportedSkillId) {
    const { data: sk } = await admin
      .from("skills")
      .select("id, name")
      .eq("tenant_id", target.tenantId)
      .eq("id", input.reportedSkillId)
      .is("archived_at", null)
      .maybeSingle()
    if (sk) {
      skillName = (sk as { name: string }).name
      reportedSkillId = (sk as { id: string }).id
    }
  }

  // Tipo de daño ESTRUCTURADO: validamos que el issue type pertenezca al tenant y
  // a la skill reportada. Guardamos su id (fuente de verdad) y su nombre como
  // etiqueta legible legacy (cases.incident_type). Si no valida → sin tipo.
  let issueTypeId: string | null = null
  let incident: string | null = null
  if (input.issueTypeId) {
    let q = admin
      .from("service_issue_types")
      .select("id, name, skill_id")
      .eq("tenant_id", target.tenantId)
      .eq("id", input.issueTypeId)
      .eq("active", true)
    if (reportedSkillId) q = q.eq("skill_id", reportedSkillId)
    const { data: it } = await q.maybeSingle()
    if (it) {
      issueTypeId = (it as { id: string }).id
      incident = (it as { name: string }).name
    }
  }

  // Token de seguimiento: lo generamos aquí para devolverlo de inmediato (la BD
  // también tiene un default, pero queremos el valor sin un segundo viaje).
  const trackingToken = crypto.randomUUID()

  // Asunto = etiqueta humana (categoría + tipo). La DESCRIPCIÓN conserva el texto
  // LIBRE del usuario (sin inyectar el nombre de la skill) para que el clasificador
  // pueda auditar discrepancias contra la categoría elegida.
  const subject = (
    skillName
      ? `${skillName}${incident ? ` — ${incident}` : ""}`
      : incident || input.description || "Solicitud de servicio"
  ).slice(0, 200)
  // El tipo de daño va ESTRUCTURADO en `incident_type` (no incrustado en el texto).
  // `description` queda solo con el texto libre del usuario y el contexto.
  const description = [
    input.description || null,
    `Dónde: ${input.location}`,
    `Reportado por: ${input.reporterName}${input.reporterPhone ? ` — WhatsApp ${input.reporterPhone}` : ""}`,
    ...(photoUrl ? [`Foto: ${photoUrl}`] : []),
  ]
    .filter(Boolean)
    .join("\n")

  const { error: insErr } = await admin.from("cases").insert({
    tenant_id: target.tenantId,
    case_number: caseNumber as string,
    subject,
    description,
    priority: "medium",
    origin: "web",
    reporter_email: input.reporterEmail ?? null,
    reported_skill_id: reportedSkillId,
    issue_type_id: issueTypeId,
    incident_type: incident,
    tracking_token: trackingToken,
    sla_due_at: computeSlaDueAt(new Date().toISOString(), "medium"),
  } as never)
  if (insErr) throw new Error("No se pudo registrar el reporte.")

  return { caseNumber: caseNumber as string, trackingToken }
}
