import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  Case,
  CaseFilters,
  CaseInput,
  CaseStatus,
} from "@/modules/service/domain/case"
import type { CaseStats } from "@/modules/service/domain/case-stats"
import type { UUID } from "@/types/shared"

export interface CaseRepository {
  list(
    tenantId: UUID,
    filters: CaseFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Case>>
  getById(tenantId: UUID, id: UUID): Promise<Case | null>
  listForAsset(tenantId: UUID, assetId: UUID): Promise<Case[]>
  create(
    tenantId: UUID,
    params: {
      ownerId: UUID | null
      createdBy: UUID
      caseNumber: string
      slaDueAt: string | null
      input: CaseInput
    },
  ): Promise<Case>
  update(tenantId: UUID, id: UUID, input: CaseInput): Promise<Case>
  setStatus(
    tenantId: UUID,
    id: UUID,
    status: CaseStatus,
    timestamps: { resolvedAt?: string | null; closedAt?: string | null },
  ): Promise<void>
  setOwner(tenantId: UUID, id: UUID, ownerId: UUID | null): Promise<void>
  nextCaseNumber(tenantId: UUID): Promise<string>
  getStats(tenantId: UUID): Promise<CaseStats>
}
