import { describe, expect, it } from "vitest"

import type { NotificationRepository } from "@/modules/notifications/application/ports/notification-repository"
import type { RecipientResolver } from "@/modules/notifications/application/ports/recipient-resolver"
import type { NotificationInput } from "@/modules/notifications/domain/notification"
import { notifyAudience } from "@/modules/notifications/application/use-cases/notify-audience"

const TENANT = "11111111-1111-1111-1111-111111111111"

class FakeResolver implements RecipientResolver {
  constructor(private readonly users: string[]) {}
  async resolveByPermission() {
    return this.users
  }
}

class FakeNotifications implements NotificationRepository {
  created: NotificationInput[] = []
  async createMany(_tenantId: string, inputs: NotificationInput[]) {
    this.created.push(...inputs)
  }
  async listForUser() {
    return []
  }
  async countUnread() {
    return 0
  }
  async markRead() {}
  async markAllRead() {}
}

const input = {
  tenantId: TENANT,
  permissionKey: "service.scheduling.read",
  type: "sla_alert",
  title: "Orden en riesgo de SLA",
  link: "work-orders/wo-1",
}

describe("notifyAudience", () => {
  it("fans out one notification per recipient", async () => {
    const notifications = new FakeNotifications()
    const n = await notifyAudience(
      { notifications, recipients: new FakeResolver(["u1", "u2", "u3"]) },
      input,
    )
    expect(n).toBe(3)
    expect(notifications.created).toHaveLength(3)
    expect(notifications.created.map((c) => c.recipientUserId)).toEqual(["u1", "u2", "u3"])
    expect(notifications.created[0]).toMatchObject({ type: "sla_alert", link: "work-orders/wo-1" })
  })

  it("does nothing when there are no recipients", async () => {
    const notifications = new FakeNotifications()
    const n = await notifyAudience(
      { notifications, recipients: new FakeResolver([]) },
      input,
    )
    expect(n).toBe(0)
    expect(notifications.created).toHaveLength(0)
  })
})
