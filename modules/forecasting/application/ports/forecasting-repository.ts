import type { UUID } from "@/types/shared"
import type { ForecastPeriod, RepPerformance, RevenueMetrics, StageMetrics, RevenueTrendPoint } from "@/modules/forecasting/domain/revenue-metrics"
import type { ForecastSnapshot, ForecastSnapshotInput } from "@/modules/forecasting/domain/forecast-snapshot"
import type { SalesQuota, SalesQuotaInput } from "@/modules/forecasting/domain/sales-quota"

export interface ForecastingRepository {
  // Core metrics — aggregated from opportunities (no new tables)
  getRevenueMetrics(tenantId: UUID, period: ForecastPeriod): Promise<RevenueMetrics>
  getStageMetrics(tenantId: UUID): Promise<StageMetrics[]>
  getRepPerformance(tenantId: UUID, period: ForecastPeriod): Promise<RepPerformance[]>
  getRevenueTrend(tenantId: UUID): Promise<RevenueTrendPoint[]>

  // Snapshots
  createSnapshot(tenantId: UUID, userId: UUID, input: ForecastSnapshotInput): Promise<ForecastSnapshot>
  listSnapshots(tenantId: UUID, limit?: number): Promise<ForecastSnapshot[]>

  // Quotas
  getQuota(tenantId: UUID, periodType: string, periodLabel: string, ownerId?: UUID | null): Promise<SalesQuota | null>
  upsertQuota(tenantId: UUID, input: SalesQuotaInput): Promise<SalesQuota>
}
