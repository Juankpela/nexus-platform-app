"use server"

import { markAllNotificationsReadRecord } from "@/modules/notifications/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type NotificationActionState = { ok: boolean }

function field(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

export async function markAllNotificationsReadAction(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return { ok: false }
  try {
    const ctx = await getRequestContext(tenantSlug)
    await markAllNotificationsReadRecord(ctx.tenantId, ctx.userId)
  } catch {
    return { ok: false }
  }
  return { ok: true }
}
