import {
  classifyWorkOrderTiming,
  slaAlertSeverity,
  type AlertSeverity,
} from "@/modules/scheduling/domain/overdue"
import type { WorkOrderSlaView } from "@/modules/service/domain/work-order"

/**
 * Pure, LIVE projection of SLA alerts for the dispatch card. Reuses the single
 * domain classifier — no duplicated rules. The card is derived/stateless: it
 * does NOT read the scanner cursor (work_order_alert_state) nor audit_events
 * (those are dedup/bookkeeping, not visual source of truth). Same SLA-only
 * scope as the scanner (breached/at_risk) so the durable signal and the live
 * view stay consistent.
 */
export type SlaAlertItem = {
  workOrderId: string
  workOrderNumber: string
  subject: string
  slaDueAt: string
  severity: AlertSeverity
}

export type SlaAlertBoard = {
  critical: SlaAlertItem[]
  atRisk: SlaAlertItem[]
  criticalCount: number
  atRiskCount: number
}

export type ProjectSlaAlertsOptions = {
  nowMs: number
  atRiskWindowMs?: number
}

export function projectSlaAlertBoard(
  rows: WorkOrderSlaView[],
  options: ProjectSlaAlertsOptions,
): SlaAlertBoard {
  const critical: SlaAlertItem[] = []
  const atRisk: SlaAlertItem[] = []

  for (const row of rows) {
    const timing = classifyWorkOrderTiming(
      { status: row.status, scheduledEnd: row.scheduledEnd, slaDueAt: row.slaDueAt },
      options,
    )
    const severity = slaAlertSeverity(timing.sla)
    if (!severity) continue
    const item: SlaAlertItem = {
      workOrderId: row.id,
      workOrderNumber: row.workOrderNumber,
      subject: row.subject,
      slaDueAt: row.slaDueAt,
      severity,
    }
    if (severity === "critical") critical.push(item)
    else atRisk.push(item)
  }

  // Most urgent first (earliest deadline). Stable string compare on ISO works.
  const byDeadline = (a: SlaAlertItem, b: SlaAlertItem) =>
    a.slaDueAt < b.slaDueAt ? -1 : a.slaDueAt > b.slaDueAt ? 1 : 0
  critical.sort(byDeadline)
  atRisk.sort(byDeadline)

  return {
    critical,
    atRisk,
    criticalCount: critical.length,
    atRiskCount: atRisk.length,
  }
}
