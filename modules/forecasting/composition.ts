import "server-only"

import { SupabaseForecastingRepository } from "@/modules/forecasting/infrastructure/supabase-forecasting-repository"
import { getRevenueMetrics } from "@/modules/forecasting/application/use-cases/get-revenue-metrics"
import { getPipelineAnalytics } from "@/modules/forecasting/application/use-cases/get-pipeline-analytics"
import { getRepPerformance } from "@/modules/forecasting/application/use-cases/get-rep-performance"
import { takeForecastSnapshot } from "@/modules/forecasting/application/use-cases/take-forecast-snapshot"
import { getAiRevenueInsights } from "@/modules/forecasting/application/use-cases/get-ai-revenue-insights"
import type { ForecastPeriod } from "@/modules/forecasting/domain/revenue-metrics"
import type { UUID } from "@/types/shared"

function forecastingRepo() {
  return new SupabaseForecastingRepository()
}

export function getTenantRevenueMetrics(tenantId: UUID, period: ForecastPeriod) {
  return getRevenueMetrics({ repo: forecastingRepo() }, tenantId, period)
}

export function getTenantPipelineAnalytics(tenantId: UUID) {
  return getPipelineAnalytics({ repo: forecastingRepo() }, tenantId)
}

export function getTenantRepPerformance(tenantId: UUID, period: ForecastPeriod) {
  return getRepPerformance({ repo: forecastingRepo() }, tenantId, period)
}

export function getTenantRevenueTrend(tenantId: UUID) {
  return forecastingRepo().getRevenueTrend(tenantId)
}

export function takeTenantForecastSnapshot(tenantId: UUID, userId: UUID, period: ForecastPeriod) {
  return takeForecastSnapshot({ repo: forecastingRepo() }, tenantId, userId, period)
}

export function listTenantForecastSnapshots(tenantId: UUID, limit?: number) {
  return forecastingRepo().listSnapshots(tenantId, limit)
}

export function getTenantAiInsights(tenantId: UUID) {
  return getAiRevenueInsights(tenantId)
}

export function getTenantQuota(tenantId: UUID, periodType: string, periodLabel: string, ownerId?: UUID | null) {
  return forecastingRepo().getQuota(tenantId, periodType, periodLabel, ownerId)
}
