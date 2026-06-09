import type { UUID } from "@/types/shared"
import type { ForecastPeriod, RepPerformance } from "@/modules/forecasting/domain/revenue-metrics"
import type { ForecastingRepository } from "@/modules/forecasting/application/ports/forecasting-repository"

type Deps = { repo: ForecastingRepository }

export async function getRepPerformance(
  { repo }: Deps,
  tenantId: UUID,
  period: ForecastPeriod,
): Promise<RepPerformance[]> {
  return repo.getRepPerformance(tenantId, period)
}
