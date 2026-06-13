import type { NotificationRepository } from "@/modules/notifications/application/ports/notification-repository"
import type { RecipientResolver } from "@/modules/notifications/application/ports/recipient-resolver"
import type { UUID } from "@/types/shared"

export type NotifyAudienceDeps = {
  notifications: NotificationRepository
  recipients: RecipientResolver
}

export type NotifyAudienceInput = {
  tenantId: UUID
  /** Permission that defines the audience (e.g. service.scheduling.read). */
  permissionKey: string
  type: string
  title: string
  body?: string | null
  link?: string | null
}

/**
 * Fan-out a notification to every active member holding `permissionKey`
 * (ADR-030). Returns how many recipients were notified. Pure orchestration over
 * the ports; the caller decides isolation/error handling.
 */
export async function notifyAudience(
  deps: NotifyAudienceDeps,
  input: NotifyAudienceInput,
): Promise<number> {
  const userIds = await deps.recipients.resolveByPermission(
    input.tenantId,
    input.permissionKey,
  )
  if (userIds.length === 0) return 0

  await deps.notifications.createMany(
    input.tenantId,
    userIds.map((recipientUserId) => ({
      recipientUserId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })),
  )
  return userIds.length
}
