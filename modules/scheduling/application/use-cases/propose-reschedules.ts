import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { RescheduleCandidateReader } from "@/modules/scheduling/application/ports/reschedule-candidate-reader"
import { localDateMinute } from "@/modules/scheduling/domain/local-time"
import {
  buildRescheduleProposal,
  type RescheduleProposal,
} from "@/modules/scheduling/domain/reschedule-proposal"
import type { UUID } from "@/types/shared"

/** Durable event for a dry-run proposal (no write). PR6/UI read these. */
export const RESCHEDULE_PROPOSED_EVENT = "scheduling.reschedule_proposed"

export type ProposeReschedulesDeps = {
  reader: RescheduleCandidateReader
  audit: AuditRepository
  nowMs: number
  requestId: UUID
  timeZone: string
  horizonDays: number
}

export type ProposeReschedulesResult = {
  evaluated: number
  rescheduleProposals: number
  needsHuman: number
  noSlot: number
  errors: number
}

async function emit(
  deps: ProposeReschedulesDeps,
  tenantId: UUID,
  proposal: RescheduleProposal,
): Promise<void> {
  await deps.audit.append({
    eventType: RESCHEDULE_PROPOSED_EVENT,
    actorType: "system",
    actorId: null,
    tenantId,
    subjectType: "work_order",
    subjectId: proposal.workOrderId,
    action: "work_order.reschedule_proposed",
    metadata: {
      disposition: proposal.disposition,
      nonCompletionReason: proposal.nonCompletionReason,
      outcome: proposal.outcome,
      technicianId: proposal.technicianId,
      technicianName: proposal.technicianName,
      proposedDate: proposal.slot?.date ?? null,
      proposedStartMinute: proposal.slot?.startMinute ?? null,
      proposedEndMinute: proposal.slot?.endMinute ?? null,
    },
    requestId: deps.requestId,
    source: "scheduling-scan",
  })
}

/**
 * Dry-run auto-reschedule: for each actionable candidate, compute what the
 * engine WOULD do and emit a proposal to the audit trail. WRITES NOTHING to
 * assignments (ADR-029). The double gate is upstream (the reader only returns
 * actionable dispositions) + the pure builder (reschedulable→slot,
 * reassignable→human). Idempotency in dry-run is by-overwrite at the read side
 * (latest proposal per WO wins); the retry-cap state lands with activation.
 */
export async function proposeReschedulesForTenant(
  deps: ProposeReschedulesDeps,
  tenantId: UUID,
): Promise<ProposeReschedulesResult> {
  const now = localDateMinute(new Date(deps.nowMs).toISOString(), deps.timeZone)
  const result: ProposeReschedulesResult = {
    evaluated: 0,
    rescheduleProposals: 0,
    needsHuman: 0,
    noSlot: 0,
    errors: 0,
  }
  if (!now) return result

  const candidates = await deps.reader.listActionableCandidates(tenantId)
  result.evaluated = candidates.length

  for (const candidate of candidates) {
    try {
      const proposal = buildRescheduleProposal(candidate, {
        fromDate: now.date,
        fromMinute: now.minute,
        horizonDays: deps.horizonDays,
      })
      if (proposal.outcome === "no_action") continue
      await emit(deps, tenantId, proposal)
      if (proposal.outcome === "reschedule") result.rescheduleProposals += 1
      else if (proposal.outcome === "reassign_needs_human") result.needsHuman += 1
      else if (proposal.outcome === "no_slot") result.noSlot += 1
    } catch {
      result.errors += 1
    }
  }

  return result
}
