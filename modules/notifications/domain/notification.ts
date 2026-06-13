import type { UUID } from "@/types/shared"

/** A delivered in-app notification (ADR-030). */
export type Notification = {
  id: UUID
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

/** Fan-out payload — one per recipient. */
export type NotificationInput = {
  recipientUserId: UUID
  type: string
  title: string
  body: string | null
  link: string | null
}

export function isUnread(notification: Pick<Notification, "readAt">): boolean {
  return notification.readAt === null
}
