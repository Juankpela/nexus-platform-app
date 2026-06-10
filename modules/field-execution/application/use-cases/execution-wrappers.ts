import { ApplicationError } from "@/lib/errors/application-error"
import {
  advanceExecution,
  type AdvanceExecutionDeps,
  type AdvanceExecutionInput,
} from "@/modules/field-execution/application/use-cases/advance-execution"
import type { Execution } from "@/modules/field-execution/domain/execution"

/**
 * Nominal (intention-revealing) wrappers over the single guarded transition
 * `advanceExecution` (ADR-022). Each fixes the `target` so call-sites read as
 * domain verbs instead of passing a raw status string.
 *
 * Mapping onto the validated FWX-1 state machine
 * (`pending→accepted→on_site→working→completed|unable_to_complete`):
 *
 *   acceptExecution            → accepted            (técnico acepta la asignación)
 *   startExecution             → on_site             (inicia la visita: llega a sitio)
 *   resumeExecution            → working             (comienza/reanuda el trabajo)
 *   completeExecution          → completed
 *   unableToCompleteExecution  → unable_to_complete
 *
 * `pauseExecution` is RESERVED vocabulary: the validated FWX-1A lifecycle has no
 * paused state, so it deliberately raises a domain error instead of inventing one
 * (a paused/working toggle is FWX-1B scope — see ADR-022). It is exported so the
 * public verb-set is complete and the contract is explicit, not silently missing.
 */

/** Input for a nominal wrapper — identical to advanceExecution minus `target`. */
export type ExecutionActionInput = Omit<AdvanceExecutionInput, "target">

export function acceptExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  return advanceExecution(deps, { ...input, target: "accepted" })
}

export function startExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  return advanceExecution(deps, { ...input, target: "on_site" })
}

export function resumeExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  return advanceExecution(deps, { ...input, target: "working" })
}

export function completeExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  return advanceExecution(deps, { ...input, target: "completed" })
}

export function unableToCompleteExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  return advanceExecution(deps, { ...input, target: "unable_to_complete" })
}

/**
 * Reserved for FWX-1B. There is no `paused` state in the validated FWX-1A
 * lifecycle, so pausing is not a legal transition — calling this raises a domain
 * error rather than mutating state. Keeps the verb-set explicit (no silent gap).
 */
export function pauseExecution(
  deps: AdvanceExecutionDeps,
  input: ExecutionActionInput,
): Promise<Execution> {
  void deps
  void input
  return Promise.reject(
    new ApplicationError(
      "Pause is not part of the validated FWX-1A execution lifecycle (reserved for FWX-1B).",
      "EXECUTION_PAUSE_UNSUPPORTED",
    ),
  )
}
