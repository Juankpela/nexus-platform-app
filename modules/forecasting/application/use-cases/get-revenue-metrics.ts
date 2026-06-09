import type { UUID } from "@/types/shared"
import type { ForecastPeriod, RevenueMetrics } from "@/modules/forecasting/domain/revenue-metrics"
import type { ForecastingRepository } from "@/modules/forecasting/application/ports/forecasting-repository"

type Deps = { repo: ForecastingRepository }

export async function getRevenueMetrics(
  { repo }: Deps,
  tenantId: UUID,
  period: ForecastPeriod,
): Promise<RevenueMetrics> {
  return repo.getRevenueMetrics(tenantId, period)
}
