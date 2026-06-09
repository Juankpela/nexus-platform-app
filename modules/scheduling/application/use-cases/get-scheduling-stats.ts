import type { SchedulingRepository } from "@/modules/scheduling/application/ports/scheduling-repository"
import type { UUID } from "@/types/shared"

export function getSchedulingStats(
  assignments: SchedulingRepository,
  tenantId: UUID,
) {
  return assignments.getStats(tenantId)
}
