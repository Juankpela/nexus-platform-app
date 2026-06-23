"use server"

import { revalidatePath } from "next/cache"

import { broadcastFieldMonitorUpdate } from "@/lib/realtime/field-monitor-broadcast"
import { insertTrackingMessageByToken } from "@/modules/service/composition"
import type { TrackingMessageKind } from "@/modules/service/composition"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export type TrackingMessageState = { ok: boolean; error: string | null }

function field(form: FormData, name: string): string {
  const v = form.get(name)
  return typeof v === "string" ? v.trim() : ""
}

/** tenant_id del caso dueño del token — para refrescar las superficies del equipo. */
async function tenantForToken(token: string): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin
    .from("cases")
    .select("tenant_id")
    .eq("tracking_token", token)
    .maybeSingle()
  return (data?.tenant_id as string | undefined) ?? null
}

/**
 * Acción pública del seguimiento: el cliente deja un comentario para su técnico o
 * solicita reagendar/cancelar. Sin login: el tracking token es la llave. No muta
 * la operación — queda como bandera para el coordinador. Honeypot anti-bot.
 */
async function submit(
  formData: FormData,
  kind: TrackingMessageKind,
  opts?: { requireBody?: boolean },
): Promise<TrackingMessageState> {
  // Honeypot: los humanos no llenan este campo oculto.
  if (field(formData, "website")) return { ok: true, error: null }

  const token = field(formData, "token")
  if (!token) return { ok: false, error: "Enlace inválido." }

  const bodyRaw = field(formData, "body")
  const body = bodyRaw.length > 0 ? bodyRaw.slice(0, 2000) : null
  if (opts?.requireBody && !body) {
    return { ok: false, error: "Escribe un mensaje." }
  }

  const preferredRaw = field(formData, "preferred_at")
  // datetime-local llega sin zona; lo guardamos tal cual como ISO local.
  const preferredAt = preferredRaw ? new Date(preferredRaw).toISOString() : null

  const ok = await insertTrackingMessageByToken({ trackingToken: token, kind, body, preferredAt })
  if (!ok) return { ok: false, error: "No pudimos registrar tu mensaje. Verifica el enlace." }

  // Refresca las superficies del equipo (detalle de WO / monitor) en vivo.
  const tenantId = await tenantForToken(token)
  if (tenantId) await broadcastFieldMonitorUpdate(tenantId)

  revalidatePath(`/seguimiento/${token}`)
  return { ok: true, error: null }
}

export async function submitCommentAction(
  _state: TrackingMessageState,
  formData: FormData,
): Promise<TrackingMessageState> {
  return submit(formData, "comment", { requireBody: true })
}

export async function submitRescheduleRequestAction(
  _state: TrackingMessageState,
  formData: FormData,
): Promise<TrackingMessageState> {
  return submit(formData, "reschedule_request")
}

export async function submitCancelRequestAction(
  _state: TrackingMessageState,
  formData: FormData,
): Promise<TrackingMessageState> {
  return submit(formData, "cancel_request", { requireBody: true })
}
