import type { UUID } from "@/types/shared"

export type ForecastPeriod = "this_month" | "this_quarter" | "this_year" | "all_time"

export const FORECAST_PERIOD_LABELS: Record<ForecastPeriod, string> = {
  this_month:   "Este mes",
  this_quarter: "Este trimestre",
  this_year:    "Este año",
  all_time:     "Todo el tiempo",
}

export type RevenueMetrics = {
  // Core revenue KPIs
  expectedRevenue:    number   // sum(amount) open opps
  weightedRevenue:    number   // sum(amount * probability/100) open opps
  closedWonRevenue:   number   // sum(amount) won
  closedLostRevenue:  number   // sum(amount) lost

  // Count KPIs
  openCount:  number
  wonCount:   number
  lostCount:  number
  totalCount: number

  // Derived KPIs
  winRate:          number          // wonCount / (wonCount + lostCount) * 100
  avgDealSize:      number | null   // avg(amount) won opps
  avgSalesCycleDays: number | null  // avg days from created to closed
  pipelineCoverage: number | null   // weightedRevenue / quota * 100

  // AI fields (architecture ready)
  forecastScore:   number | null    // 0–100
  riskScore:       number | null    // 0–100

  period: ForecastPeriod
}

export type StageMetrics = {
  status:          string
  label:           string
  count:           number
  revenue:         number
  weightedRevenue: number
  conversionRate:  number | null  // % that moved past this stage (estimated)
  avgDaysInStage:  number | null
}

export type RepPerformance = {
  ownerId:           UUID
  ownerName:         string
  wonCount:          number
  openCount:         number
  lostCount:         number
  revenueWon:        number
  weightedRevenue:   number
  avgDealSize:       number | null
  winRate:           number
}

export type RevenueTrendPoint = {
  label:          string   // 'Ene', 'Feb', ...
  expectedRevenue: number
  weightedRevenue: number
  closedWon:      number
}
