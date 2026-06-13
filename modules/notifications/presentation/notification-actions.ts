"use server"

import { z } from "zod"

import {
  markAllNotificationsReadRecord,
  markNotificationReadRecord,
} from "@/modules/notifications/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type NotificationActionState = { ok: boolean }

const idSchema = z.uuid()

function field(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

export async function markNotificationReadAction(
  _state: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  const id = idSchema.safeParse(field(formData, "id"))
  if (!tenantSlug || !id.success) return { ok: false }
  try {
    const ctx = await getRequestContext(tenantSlug)
    await markNotificationReadRecord(ctx.tenantId, ctx.userId, id.data)
  } catch {
    return { ok: false }
  }
  return { ok: true }
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
