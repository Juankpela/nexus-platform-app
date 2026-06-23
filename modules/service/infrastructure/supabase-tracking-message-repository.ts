import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  type CustomerTrackingMessage,
  type TrackingMessageKind,
} from "@/modules/service/domain/tracking-message"
import type { UUID } from "@/types/shared"

type Row = {
  id: string
  kind: string
  body: string | null
  preferred_at: string | null
  status: string
  created_at: string
  work_order_id: string | null
}

function toMessage(row: Row): CustomerTrackingMessage {
  return {
    id: row.id,
    kind: row.kind as TrackingMessageKind,
    body: row.body,
    preferredAt: row.preferred_at,
    status: row.status === "resolved" ? "resolved" : "open",
    createdAt: row.created_at,
    workOrderId: row.work_order_id,
  }
}

/**
 * Inserta una interacción del cliente desde la página pública de seguimiento.
 * Seguridad: el `trackingToken` (uuid no adivinable del caso) hace de llave —
 * se resuelve el caso/tenant con el service role (omite RLS) y se asocia a la WO
 * más reciente del caso. Devuelve false si el token no corresponde a un caso.
 */
export async function insertTrackingMessageByToken(input: {
  trackingToken: string
  kind: TrackingMessageKind
  body: string | null
  preferredAt: string | null
}): Promise<boolean> {
  const admin = createAdminSupabaseClient()

  const { data: caseRow } = await admin
    .from("cases")
    .select("id, tenant_id")
    .eq("tracking_token", input.trackingToken)
    .maybeSingle()
  if (!caseRow) return false

  const tenantId = caseRow.tenant_id as string
  const caseId = caseRow.id as string

  const { data: wo } = await admin
    .from("work_orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await admin.from("case_tracking_messages").insert({
    tenant_id: tenantId,
    case_id: caseId,
    work_order_id: (wo?.id as string | undefined) ?? null,
    kind: input.kind,
    body: input.body,
    preferred_at: input.preferredAt,
  })
  return !error
}

/** Hilo de interacciones del cliente para una WO (lo ve el técnico y el admin). */
export async function listTrackingMessagesByWorkOrder(
  tenantId: UUID,
  workOrderId: UUID,
): Promise<CustomerTrackingMessage[]> {
  const client = await createServerSupabaseClient()
  const { data } = await client
    .from("case_tracking_messages")
    .select("id, kind, body, preferred_at, status, created_at, work_order_id")
    .eq("tenant_id", tenantId)
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false })
  return ((data as Row[] | null) ?? []).map(toMessage)
}

/** Marca una solicitud del cliente como resuelta (decisión del coordinador). */
export async function resolveTrackingMessage(
  tenantId: UUID,
  id: UUID,
  resolvedByUserId: UUID,
): Promise<void> {
  const client = await createServerSupabaseClient()
  await client
    .from("case_tracking_messages")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedByUserId,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id)
}
