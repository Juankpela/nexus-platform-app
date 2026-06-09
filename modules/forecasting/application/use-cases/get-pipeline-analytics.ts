import type { UUID } from "@/types/shared"
import type { StageMetrics } from "@/modules/forecasting/domain/revenue-metrics"
import type { ForecastingRepository } from "@/modules/forecasting/application/ports/forecasting-repository"

type Deps = { repo: ForecastingRepository }

export async function getPipelineAnalytics(
  { repo }: Deps,
  tenantId: UUID,
): Promise<StageMetrics[]> {
  return repo.getStageMetrics(tenantId)
}
