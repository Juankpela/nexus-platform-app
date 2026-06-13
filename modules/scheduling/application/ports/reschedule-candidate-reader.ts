import type { RescheduleCandidate } from "@/modules/scheduling/domain/reschedule-proposal"
import type { UUID } from "@/types/shared"

/**
 * Supplies the auto-reschedule engine with actionable candidates: open WOs whose
 * latest execution is `unable_to_complete` with an actionable disposition
 * (reschedulable/reassignable), already projected (ADR-029) with the assigned
 * technician's availability and local busy intervals. Read-only.
 */
export interface RescheduleCandidateReader {
  listActionableCandidates(tenantId: UUID): Promise<RescheduleCandidate[]>
}
