import type {
  Notification,
  NotificationInput,
} from "@/modules/notifications/domain/notification"
import type { UUID } from "@/types/shared"

export interface NotificationRepository {
  listForUser(tenantId: UUID, userId: UUID, limit: number): Promise<Notification[]>
  countUnread(tenantId: UUID, userId: UUID): Promise<number>
  markRead(tenantId: UUID, userId: UUID, id: UUID): Promise<void>
  markAllRead(tenantId: UUID, userId: UUID): Promise<void>
  /** Service-role fan-out: insert one notification per recipient. */
  createMany(tenantId: UUID, inputs: NotificationInput[]): Promise<void>
}
