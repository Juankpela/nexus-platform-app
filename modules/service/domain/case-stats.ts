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
  /**
   * DECISIÓN pendiente: vencidos activos SIN orden de trabajo activa (misma
   * regla que el guard de despacho: WO no cancelada = caso atendido). Un caso
   * vencido pero ya despachado está "en atención", no pendiente de decisión —
   * es lo que cuentan el Centro de Comando y N-LABS.
   */
  openBreachedUnattendedCount: number
}
