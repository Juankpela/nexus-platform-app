import type { ActivityRepository } from "@/modules/crm/application/ports/activity-repository"
import type { Activity, ActivityFilters } from "@/modules/crm/domain/activity"
import type { UUID } from "@/types/shared"

export function listCompanyActivities(
  activities: ActivityRepository,
  tenantId: UUID,
  companyId: UUID,
  filters: ActivityFilters,
): Promise<Activity[]> {
  return activities.listForCompany(tenantId, companyId, filters)
}

export function listContactActivities(
  activities: ActivityRepository,
  tenantId: UUID,
  contactId: UUID,
  filters: ActivityFilters,
): Promise<Activity[]> {
  return activities.listForContact(tenantId, contactId, filters)
}
