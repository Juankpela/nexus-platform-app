import type { CasePriority, CaseStatus } from "@/modules/service/domain/case"

export type CaseStats = {
  openCount: number
  totalCount: number
  byStatus: Record<CaseStatus, number>
  byPriority: Record<CasePriority, number>
  slaCompliancePct: number | null
  breachedCount: number
}
