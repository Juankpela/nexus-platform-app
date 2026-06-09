import type { UUID } from "@/types/shared"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import type { ForecastSnapshot } from "@/modules/forecasting/domain/forecast-snapshot"
import type { ForecastingRepository } from "@/modules/forecasting/application/ports/forecasting-repository"

type Deps = { repo: ForecastingRepository }

function getPeriodLabel(period: ForecastPeriod): { type: "month" | "quarter" | "year"; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const q = Math.floor(m / 3) + 1
  const mm = String(m + 1).padStart(2, "0")

  switch (period) {
    case "this_month":   return { type: "month",   label: `${y}-${mm}` }
    case "this_quarter": return { type: "quarter",  label: `${y}-Q${q}` }
    case "this_year":    return { type: "year",     label: `${y}` }
    default:             return { type: "year",     label: `${y}` }
  }
}

export async function takeForecastSnapshot(
  { repo }: Deps,
  tenantId: UUID,
  userId: UUID,
  period: ForecastPeriod,
): Promise<ForecastSnapshot> {
  const metrics = await repo.getRevenueMetrics(tenantId, period)
  const { type, label } = getPeriodLabel(period)

  return repo.createSnapshot(tenantId, userId, {
    snapshotDate:       new Date().toISOString().split("T")[0],
    periodType:         type,
    periodLabel:        label,
    expectedRevenue:    metrics.expectedRevenue,
    weightedRevenue:    metrics.weightedRevenue,
    closedWonRevenue:   metrics.closedWonRevenue,
    closedLostRevenue:  metrics.closedLostRevenue,
    openCount:          metrics.openCount,
    wonCount:           metrics.wonCount,
    lostCount:          metrics.lostCount,
    winRate:            metrics.winRate,
    avgDealSize:        metrics.avgDealSize,
    pipelineCoverage:   metrics.pipelineCoverage,
  })
}
