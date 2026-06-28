import type { CasePriority, CaseStatus } from "@/modules/service/domain/case"

export type CaseStats = {
  openCount: number
  totalCount: number
  byStatus: Record<CaseStatus, number>
  byPriority: Record<CasePriority, number>
  slaCompliancePct: number | null
  /** Histórico: todo caso incumplido, incluidos los cerrados tarde. Alimenta el % de cumplimiento. */
  breachedCount: number
  /** Accionable: vencidos ACTIVOS (abiertos cuyo SLA ya pasó). Coincide EXACTO con el filtro ?sla=overdue. */
  openBreachedCount: number
}
