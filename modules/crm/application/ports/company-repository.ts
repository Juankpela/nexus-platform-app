import type {
  Company,
  CompanyInput,
  CompanyOption,
  CrmStatus,
} from "@/modules/crm/domain/company"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface CompanyRepository {
  list(tenantId: UUID, query: ListQuery): Promise<Paginated<Company>>
  getById(tenantId: UUID, id: UUID): Promise<Company | null>
  create(tenantId: UUID, input: CompanyInput): Promise<Company>
  update(tenantId: UUID, id: UUID, input: CompanyInput): Promise<Company>
  setStatus(tenantId: UUID, id: UUID, status: CrmStatus): Promise<void>
  /** Active companies for selection (e.g. assigning a contact). */
  listActiveOptions(tenantId: UUID): Promise<CompanyOption[]>
}
