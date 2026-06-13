import "server-only"

import { SupabaseNotificationRepository } from "@/modules/notifications/infrastructure/supabase-notification-repository"
import type { UUID } from "@/types/shared"

function repo() {
  return new SupabaseNotificationRepository()
}

export function listMyNotifications(tenantId: UUID, userId: UUID) {
  return repo().listForUser(tenantId, userId, 20)
}

export function countMyUnread(tenantId: UUID, userId: UUID) {
  return repo().countUnread(tenantId, userId)
}

export function markNotificationReadRecord(tenantId: UUID, userId: UUID, id: UUID) {
  return repo().markRead(tenantId, userId, id)
}

export function markAllNotificationsReadRecord(tenantId: UUID, userId: UUID) {
  return repo().markAllRead(tenantId, userId)
}
