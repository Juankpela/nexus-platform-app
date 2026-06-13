/**
 * Deterministic timing health of a work order.
 *
 * This is Scheduling Engine logic, not Work Order CRUD — it deliberately lives
 * in the scheduling module (see ADR: "overdue detection does not belong to the
 * Work Order aggregate"). It is PURE: no I/O, no clock of its own, no dependency
 * on the service aggregate. Callers pass `now` explicitly, which makes the
 * scanner cron, the dispatch alert query, and the unit tests share one source
 * of truth.
 *
 * Two orthogonal signals are reported, because they answer different questions:
 *   - scheduleSlipped → "the planned window already passed and it is still open"
 *   - sla             → "the contractual deadline is near or already missed"
 * A job can slip its schedule without breaching SLA, and vice versa.
 */

/** Minimal projection the classifier needs — intentionally not the full WorkOrder. */
export type WorkOrderTimingView = {
  status: string
  scheduledEnd: string | null
  slaDueAt: string | null
}

export type SlaState = "none" | "ok" | "at_risk" | "breached" | "paused"

/** Escalation ladder consumed by alerts/UI. Maps to a single actionable level. */
export type TimingSeverity = "ok" | "warning" | "critical"

export type WorkOrderTiming = {
  isOpen: boolean
  /** Planned window (scheduled_end) is in the past while still open. */
  scheduleSlipped: boolean
  sla: SlaState
  severity: TimingSeverity
}

/** Statuses that close a work order — no further timing pressure applies. */
const TERMINAL_STATUSES = new Set(["completed", "cancelled"])

/**
 * Statuses that PAUSE SLA pressure (stop-the-clock, ADR-pending R1). While a WO
 * is on hold (waiting on parts, customer, etc.) it should not raise SLA/slip
 * alerts — that is alert fatigue.
 *
 * MVP scope: this SUPPRESSES alerting while paused. It does NOT shift the
 * deadline by the paused duration — true clock arithmetic needs an
 * `on_hold_since` + accumulated-pause accounting and is deferred. Consequence:
 * a WO resuming from a long hold may surface as already breached on the next
 * scan, which is acceptable (the commitment never actually moved).
 */
const PAUSED_STATUSES = new Set(["on_hold"])

export type ClassifyOptions = {
  /** Evaluation instant (ms epoch). Injected for determinism/testability. */
  nowMs: number
  /** How far before the SLA deadline a WO is flagged "at risk". Default 2h. */
  atRiskWindowMs?: number
}

const DEFAULT_AT_RISK_WINDOW_MS = 2 * 60 * 60 * 1000

function toMs(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function classifyWorkOrderTiming(
  view: WorkOrderTimingView,
  options: ClassifyOptions,
): WorkOrderTiming {
  const isOpen = !TERMINAL_STATUSES.has(view.status)
  if (!isOpen) {
    return { isOpen: false, scheduleSlipped: false, sla: "none", severity: "ok" }
  }

  // Paused (on_hold): open, but the SLA clock is stopped — no alert. We still
  // report sla="paused" (vs "ok"/"none") so the dispatch view can show it as
  // distinct from a healthy WO.
  if (PAUSED_STATUSES.has(view.status)) {
    const hasSla = toMs(view.slaDueAt) !== null
    return {
      isOpen: true,
      scheduleSlipped: false,
      sla: hasSla ? "paused" : "none",
      severity: "ok",
    }
  }

  const atRiskWindowMs = options.atRiskWindowMs ?? DEFAULT_AT_RISK_WINDOW_MS
  const nowMs = options.nowMs

  const scheduledEndMs = toMs(view.scheduledEnd)
  const scheduleSlipped = scheduledEndMs !== null && scheduledEndMs < nowMs

  const slaMs = toMs(view.slaDueAt)
  let sla: SlaState = "none"
  if (slaMs !== null) {
    if (slaMs < nowMs) sla = "breached"
    else if (slaMs - nowMs <= atRiskWindowMs) sla = "at_risk"
    else sla = "ok"
  }

  let severity: TimingSeverity = "ok"
  if (sla === "breached") severity = "critical"
  else if (sla === "at_risk" || scheduleSlipped) severity = "warning"

  return { isOpen, scheduleSlipped, sla, severity }
}

/** True when a WO needs attention from the scheduler (slipped or SLA pressure). */
export function needsAttention(timing: WorkOrderTiming): boolean {
  return timing.severity !== "ok"
}
