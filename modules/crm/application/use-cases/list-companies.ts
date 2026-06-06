import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { Company } from "@/modules/crm/domain/company"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export async function listCompanies(
  companies: CompanyRepository,
  tenantId: UUID,
  query: ListQuery,
): Promise<Paginated<Company>> {
  return companies.list(tenantId, query)
}
