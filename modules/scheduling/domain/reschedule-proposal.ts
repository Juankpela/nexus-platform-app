import type {
  Disposition,
  NonCompletionReason,
} from "@/modules/field-execution/domain/disposition"
import {
  findNextSlot,
  type BusyInterval,
  type LocalSlot,
} from "@/modules/scheduling/domain/next-slot"
import type {
  AvailabilityException,
  WeeklyWindow,
} from "@/modules/service/domain/availability"
import type { UUID } from "@/types/shared"

/**
 * Pure auto-reschedule PROPOSAL builder (PR5b, dry-run). Computes what the
 * engine WOULD do for a candidate — it never writes. The disposition is read
 * already-projected (ADR-029: scheduling does not import execution internals);
 * this module only needs the Disposition/NonCompletionReason types.
 *
 * Decision D3: reschedulable → propose the next slot for the SAME technician;
 * reassignable → flag for a human (WO requirement columns deferred); anything
 * else → no action.
 */
export type RescheduleCandidate = {
  workOrderId: UUID
  workOrderNumber: string | null
  assignmentId: UUID
  technicianId: UUID
  technicianName: string | null
  nonCompletionReason: NonCompletionReason
  disposition: Disposition
  durationMinutes: number
  windows: WeeklyWindow[]
  exceptions: AvailabilityException[]
  busy: BusyInterval[]
}

export type ProposalOutcome =
  | "reschedule" // same technician, a concrete next slot was found
  | "reassign_needs_human" // needs a different technician (skill) — human picks
  | "no_slot" // reschedulable but no slot within the horizon
  | "no_action" // disposition does not authorize an automatic action

export type RescheduleProposal = {
  workOrderId: UUID
  workOrderNumber: string | null
  nonCompletionReason: NonCompletionReason
  disposition: Disposition
  outcome: ProposalOutcome
  technicianId: UUID | null
  technicianName: string | null
  slot: LocalSlot | null
}

export type BuildProposalOptions = {
  fromDate: string
  fromMinute: number
  horizonDays: number
}

export function buildRescheduleProposal(
  candidate: RescheduleCandidate,
  options: BuildProposalOptions,
): RescheduleProposal {
  const base = {
    workOrderId: candidate.workOrderId,
    workOrderNumber: candidate.workOrderNumber,
    nonCompletionReason: candidate.nonCompletionReason,
    disposition: candidate.disposition,
    technicianId: null as UUID | null,
    technicianName: null as string | null,
    slot: null as LocalSlot | null,
  }

  if (candidate.disposition === "reassignable") {
    return { ...base, outcome: "reassign_needs_human" }
  }

  if (candidate.disposition !== "reschedulable") {
    // blocked_hold / terminal_no_action — never auto-acted (frozen safety).
    return { ...base, outcome: "no_action" }
  }

  const slot = findNextSlot({
    windows: candidate.windows,
    busy: candidate.busy,
    exceptions: candidate.exceptions,
    durationMinutes: candidate.durationMinutes,
    fromDate: options.fromDate,
    fromMinute: options.fromMinute,
    horizonDays: options.horizonDays,
  })

  if (!slot) return { ...base, outcome: "no_slot" }

  return {
    ...base,
    outcome: "reschedule",
    technicianId: candidate.technicianId,
    technicianName: candidate.technicianName,
    slot,
  }
}
