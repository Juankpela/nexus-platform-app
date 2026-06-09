import type { UUID } from "@/types/shared"

export type ForecastPeriodType = "month" | "quarter" | "year"

export type ForecastSnapshot = {
  id:                 UUID
  tenantId:           UUID
  snapshotDate:       string        // ISO date
  periodType:         ForecastPeriodType
  periodLabel:        string        // '2026-Q2', '2026-06', '2026'
  expectedRevenue:    number
  weightedRevenue:    number
  closedWonRevenue:   number
  closedLostRevenue:  number
  openCount:          number
  wonCount:           number
  lostCount:          number
  winRate:            number
  avgDealSize:        number | null
  pipelineCoverage:   number | null
  createdBy:          UUID | null
  createdAt:          string
}

export type ForecastSnapshotInput = Omit<ForecastSnapshot,
  "id" | "tenantId" | "createdBy" | "createdAt"
>
