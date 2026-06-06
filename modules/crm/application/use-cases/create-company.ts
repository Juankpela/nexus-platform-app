import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { Company, CompanyInput } from "@/modules/crm/domain/company"
import type { UUID } from "@/types/shared"

export type CreateCompanyDeps = {
  companies: CompanyRepository
  audit: AuditRepository
}

export type CreateCompanyInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: CompanyInput
}

export async function createCompany(
  { companies, audit }: CreateCompanyDeps,
  input: CreateCompanyInput,
): Promise<Company> {
  const company = await companies.create(input.tenantId, input.data)

  await audit.append({
    eventType: "crm.company.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "company",
    subjectId: company.id,
    action: "company.created",
    metadata: { name: company.name },
    requestId: input.requestId,
    source: "web",
  })

  return company
}
