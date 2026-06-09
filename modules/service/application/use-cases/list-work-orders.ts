import type { WorkOrderRepository } from "@/modules/service/application/ports/work-order-repository"
import type { WorkOrderFilters } from "@/modules/service/domain/work-order"
import type { UUID } from "@/types/shared"

export function listWorkOrders(
  workOrders: WorkOrderRepository,
  tenantId: UUID,
  filters: WorkOrderFilters,
  page: number,
  pageSize: number,
) {
  return workOrders.list(tenantId, filters, page, pageSize)
}
