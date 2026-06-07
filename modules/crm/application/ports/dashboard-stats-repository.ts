import type { UUID } from "@/types/shared"

export type PipelineStageStats = {
  status: string
  label: string
  count: number
  value: number
}

export type DashboardStats = {
  companiesCount: number
  contactsCount: number
  openOpportunitiesCount: number
  pipelineValue: number
  quotesCount: number
  wonRevenue: number
  pipelineByStage: PipelineStageStats[]
}

export interface DashboardStatsRepository {
  getStats(tenantId: UUID): Promise<DashboardStats>
}
