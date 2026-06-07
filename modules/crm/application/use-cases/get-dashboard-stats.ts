import type { DashboardStatsRepository } from "@/modules/crm/application/ports/dashboard-stats-repository"
import type { UUID } from "@/types/shared"

export function getDashboardStats(
  repo: DashboardStatsRepository,
  tenantId: UUID,
) {
  return repo.getStats(tenantId)
}
