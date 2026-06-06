import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ActivityRepository } from "@/modules/crm/application/ports/activity-repository"
import type { ActivityStatus } from "@/modules/crm/domain/activity"
import type { UUID } from "@/types/shared"

export type ChangeActivityStatusDeps = {
  activities: ActivityRepository
  audit: AuditRepository
}

export type ChangeActivityStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: ActivityStatus
  /** ISO timestamp to stamp when completing; ignored when reopening. */
  completedAt: string
}

export async function changeActivityStatus(
  { activities, audit }: ChangeActivityStatusDeps,
  input: ChangeActivityStatusInput,
): Promise<void> {
  const existing = await activities.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Activity not found.", "ACTIVITY_NOT_FOUND")
  }
  if (existing.status === input.status) return

  const completed = input.status === "completed"
  await activities.setStatus(
    input.tenantId,
    input.id,
    input.status,
    completed ? input.completedAt : null,
  )

  await audit.append({
    eventType: completed ? "crm.activity.completed" : "crm.activity.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "activity",
    subjectId: input.id,
    action: completed ? "activity.completed" : "activity.updated",
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  })
}
