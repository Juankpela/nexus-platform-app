import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ActivityRepository } from "@/modules/crm/application/ports/activity-repository"
import type { Activity, ActivityInput } from "@/modules/crm/domain/activity"
import type { UUID } from "@/types/shared"

export type UpdateActivityDeps = {
  activities: ActivityRepository
  audit: AuditRepository
}

export type UpdateActivityInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: ActivityInput
}

export async function updateActivity(
  { activities, audit }: UpdateActivityDeps,
  input: UpdateActivityInput,
): Promise<Activity> {
  const existing = await activities.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Activity not found.", "ACTIVITY_NOT_FOUND")
  }

  const activity = await activities.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "crm.activity.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "activity",
    subjectId: activity.id,
    action: "activity.updated",
    metadata: { type: activity.type, subject: activity.subject },
    requestId: input.requestId,
    source: "web",
  })

  return activity
}
