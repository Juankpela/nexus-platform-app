import type { UUID } from "@/types/shared"
import type { ForecastPeriodType } from "./forecast-snapshot"

export type SalesQuota = {
  id:           UUID
  tenantId:     UUID
  ownerId:      UUID | null   // null = team-level quota
  periodType:   ForecastPeriodType
  periodLabel:  string
  quotaAmount:  number
  createdAt:    string
  updatedAt:    string
}

export type SalesQuotaInput = {
  ownerId:     UUID | null
  periodType:  ForecastPeriodType
  periodLabel: string
  quotaAmount: number
}
