import type { CasePriority } from "@/modules/service/domain/case"

/**
 * SLA engine (basic). Resolution-time targets per priority, in hours.
 * Stored as an absolute deadline (sla_due_at) on the case so future pause
 * logic (e.g. stop the clock while Waiting Customer) can be added without a
 * schema change.
 */
export const SLA_HOURS_BY_PRIORITY: Record<CasePriority, number> = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
}

export type SlaStatus = "on_track" | "at_risk" | "breached" | "met"

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  on_track: "En tiempo",
  at_risk: "En riesgo",
  breached: "Incumplido",
  met: "Cumplido",
}

/** Compute the absolute SLA deadline from a creation instant + priority. */
export function computeSlaDueAt(
  createdAtIso: string,
  priority: CasePriority,
): string {
  const created = new Date(createdAtIso).getTime()
  const due = created + SLA_HOURS_BY_PRIORITY[priority] * 3_600_000
  return new Date(due).toISOString()
}

/**
 * Derive the current SLA status of a case.
 * - Closed/resolved cases: "met" if finished on or before the deadline, else "breached".
 * - Open cases: "breached" if past deadline, "at_risk" within the final 25% of the
 *   priority window, otherwise "on_track".
 */
export function computeSlaStatus(params: {
  slaDueAt: string | null
  priority: CasePriority
  resolvedAt: string | null
  closedAt: string | null
  now: Date
}): SlaStatus | null {
  const { slaDueAt, priority, resolvedAt, closedAt, now } = params
  if (!slaDueAt) return null

  const due = new Date(slaDueAt).getTime()
  const finishedIso = resolvedAt ?? closedAt
  if (finishedIso) {
    return new Date(finishedIso).getTime() <= due ? "met" : "breached"
  }

  const remainingMs = due - now.getTime()
  if (remainingMs <= 0) return "breached"

  const windowMs = SLA_HOURS_BY_PRIORITY[priority] * 3_600_000
  if (remainingMs <= windowMs * 0.25) return "at_risk"
  return "on_track"
}
