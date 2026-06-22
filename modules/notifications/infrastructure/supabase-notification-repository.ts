import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { NotificationRepository } from "@/modules/notifications/application/ports/notification-repository"
import type {
  Notification,
  NotificationInput,
} from "@/modules/notifications/domain/notification"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type Row = Database["public"]["Tables"]["notifications"]["Row"]
type ClientFactory = () =>
  | Promise<SupabaseClient<Database>>
  | SupabaseClient<Database>

function toNotification(row: Row): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

export class SupabaseNotificationRepository implements NotificationRepository {
  /** Defaults to the cookie-based server client; the scanner passes an admin factory. */
  constructor(private readonly createClient: ClientFactory = createServerSupabaseClient) {}

  async listForUser(tenantId: UUID, userId: UUID, limit: number): Promise<Notification[]> {
    const client = await this.createClient()
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new ApplicationError("Unable to list notifications.", "NOTIFICATION_LIST_FAILED", error)
    }
    return (data ?? []).map(toNotification)
  }

  async countUnread(tenantId: UUID, userId: UUID): Promise<number> {
    const client = await this.createClient()
    const { count, error } = await client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("recipient_user_id", userId)
      .is("read_at", null)

    if (error) {
      throw new ApplicationError("Unable to count notifications.", "NOTIFICATION_COUNT_FAILED", error)
    }
    return count ?? 0
  }

  async markAllRead(tenantId: UUID, userId: UUID): Promise<void> {
    const client = await this.createClient()
    const { error } = await client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("recipient_user_id", userId)
      .is("read_at", null)

    if (error) {
      throw new ApplicationError("Unable to mark notifications read.", "NOTIFICATION_MARK_ALL_FAILED", error)
    }
  }

  async createMany(tenantId: UUID, inputs: NotificationInput[]): Promise<void> {
    if (inputs.length === 0) return
    const client = await this.createClient()
    const { error } = await client.from("notifications").insert(
      inputs.map((n) => ({
        tenant_id: tenantId,
        recipient_user_id: n.recipientUserId,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
      })),
    )

    if (error) {
      throw new ApplicationError("Unable to create notifications.", "NOTIFICATION_CREATE_FAILED", error)
    }
  }
}
