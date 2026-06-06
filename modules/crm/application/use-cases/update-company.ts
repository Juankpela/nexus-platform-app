import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { Company, CompanyInput } from "@/modules/crm/domain/company"
import type { UUID } from "@/types/shared"

export type UpdateCompanyDeps = {
  companies: CompanyRepository
  audit: AuditRepository
}

export type UpdateCompanyInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: CompanyInput
}

export async function updateCompany(
  { companies, audit }: UpdateCompanyDeps,
  input: UpdateCompanyInput,
): Promise<Company> {
  const existing = await companies.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Company not found.", "COMPANY_NOT_FOUND")
  }

  const company = await companies.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "crm.company.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "company",
    subjectId: company.id,
    action: "company.updated",
    metadata: { name: company.name },
    requestId: input.requestId,
    source: "web",
  })

  return company
}
