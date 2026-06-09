import type {
  Activity,
  ActivityFilters,
  ActivityInput,
  ActivityStatus,
} from "@/modules/crm/domain/activity"
import type { UUID } from "@/types/shared"

export interface ActivityRepository {
  listForCompany(
    tenantId: UUID,
    companyId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  listForContact(
    tenantId: UUID,
    contactId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  listForOpportunity(
    tenantId: UUID,
    opportunityId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  listForCase(
    tenantId: UUID,
    caseId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  listForAsset(
    tenantId: UUID,
    assetId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  listForWorkOrder(
    tenantId: UUID,
    workOrderId: UUID,
    filters: ActivityFilters,
  ): Promise<Activity[]>
  getById(tenantId: UUID, id: UUID): Promise<Activity | null>
  create(tenantId: UUID, createdBy: UUID, input: ActivityInput): Promise<Activity>
  update(tenantId: UUID, id: UUID, input: ActivityInput): Promise<Activity>
  setStatus(
    tenantId: UUID,
    id: UUID,
    status: ActivityStatus,
    completedAt: string | null,
  ): Promise<void>
}
