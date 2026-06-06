import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ActivityRepository } from "@/modules/crm/application/ports/activity-repository"
import type { Activity, ActivityInput } from "@/modules/crm/domain/activity"
import type { UUID } from "@/types/shared"

export type CreateActivityDeps = {
  activities: ActivityRepository
  audit: AuditRepository
}

export type CreateActivityInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: ActivityInput
}

export async function createActivity(
  { activities, audit }: CreateActivityDeps,
  input: CreateActivityInput,
): Promise<Activity> {
  if (!input.data.companyId && !input.data.contactId) {
    throw new ApplicationError(
      "An activity must reference a company or a contact.",
      "ACTIVITY_TARGET_REQUIRED",
    )
  }

  const activity = await activities.create(
    input.tenantId,
    input.actorId,
    input.data,
  )

  await audit.append({
    eventType: "crm.activity.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "activity",
    subjectId: activity.id,
    action: "activity.created",
    metadata: {
      type: activity.type,
      subject: activity.subject,
      companyId: activity.companyId,
      contactId: activity.contactId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return activity
}
