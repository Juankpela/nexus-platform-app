import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type { AssignmentFilters } from "@/modules/scheduling/domain/work-order-assignment"
import type { UUID } from "@/types/shared"

export function listAssignments(
  assignments: SchedulingRepository,
  tenantId: UUID,
  filters: AssignmentFilters,
  page: number,
  pageSize: number,
) {
  return assignments.list(tenantId, filters, page, pageSize)
}
