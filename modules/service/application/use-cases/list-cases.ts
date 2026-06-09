import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import type { CaseFilters } from "@/modules/service/domain/case"
import type { UUID } from "@/types/shared"

export function listCases(
  cases: CaseRepository,
  tenantId: UUID,
  filters: CaseFilters,
  page: number,
  pageSize: number,
) {
  return cases.list(tenantId, filters, page, pageSize)
}
