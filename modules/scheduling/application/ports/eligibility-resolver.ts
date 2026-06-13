import type {
  EligibilityRequirement,
  EligibilityResult,
} from "@/modules/scheduling/domain/eligibility"
import type { UUID } from "@/types/shared"

/**
 * Seam for technician matching (ADR-028). PR4 ships a deterministic resolver;
 * PR5 automation and a future ML/optimization resolver implement the SAME port
 * without changing callers. Read-only: returns candidates, writes nothing.
 */
export interface EligibilityResolver {
  /**
   * Eligible technicians for a requirement, evaluated and ordered
   * deterministically (lighter day-load first). Includes per-candidate reasons
   * for transparency.
   */
  findEligible(
    tenantId: UUID,
    requirement: EligibilityRequirement,
  ): Promise<EligibilityResult[]>
}
