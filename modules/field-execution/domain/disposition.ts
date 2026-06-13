/**
 * Outcome → disposition policy (ADR-029). PURE and FIXED (per-tenant config
 * deferred). The disposition authorizes auto-action; the reason is the execution
 * fact. Conservative by design: anything not explicitly reschedulable/reassignable
 * yields NO auto-action.
 */

export type NonCompletionReason =
  | "customer_absent"
  | "missing_skill"
  | "missing_part"
  | "access_denied"
  | "weather"
  | "customer_cancelled"
  | "other"

export const NON_COMPLETION_REASONS: NonCompletionReason[] = [
  "customer_absent",
  "missing_skill",
  "missing_part",
  "access_denied",
  "weather",
  "customer_cancelled",
  "other",
]

export const NON_COMPLETION_REASON_LABELS: Record<NonCompletionReason, string> = {
  customer_absent: "Cliente ausente",
  missing_skill: "Falta habilidad",
  missing_part: "Falta repuesto",
  access_denied: "Acceso denegado",
  weather: "Clima",
  customer_cancelled: "Cancelado por cliente",
  other: "Otro",
}

export type Disposition =
  | "reschedulable"
  | "reassignable"
  | "blocked_hold"
  | "terminal_no_action"

export type NextAction =
  | "auto_reschedule"
  | "auto_reassign"
  | "hold_for_human"
  | "close_no_action"

const REASON_DISPOSITION: Record<NonCompletionReason, Disposition> = {
  customer_absent: "reschedulable",
  weather: "reschedulable",
  missing_skill: "reassignable",
  missing_part: "blocked_hold",
  access_denied: "blocked_hold",
  customer_cancelled: "terminal_no_action",
  other: "blocked_hold", // conservative default
}

const DISPOSITION_NEXT_ACTION: Record<Disposition, NextAction> = {
  reschedulable: "auto_reschedule",
  reassignable: "auto_reassign",
  blocked_hold: "hold_for_human",
  terminal_no_action: "close_no_action",
}

/** Maps a reason to its disposition. A missing/unknown reason is conservatively held. */
export function reasonToDisposition(reason: NonCompletionReason | null): Disposition {
  if (reason === null) return "blocked_hold"
  return REASON_DISPOSITION[reason] ?? "blocked_hold"
}

export function nextActionFor(disposition: Disposition): NextAction {
  return DISPOSITION_NEXT_ACTION[disposition]
}

/** The frozen gate's WHY: only reschedulable/reassignable may auto-act. */
export function autoActionAllowed(disposition: Disposition): boolean {
  return disposition === "reschedulable" || disposition === "reassignable"
}
