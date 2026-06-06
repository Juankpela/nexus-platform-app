import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { CrmStatus } from "@/modules/crm/domain/company"
import type { UUID } from "@/types/shared"

export type ChangeCompanyStatusDeps = {
  companies: CompanyRepository
  audit: AuditRepository
}

export type ChangeCompanyStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: CrmStatus
}

export async function changeCompanyStatus(
  { companies, audit }: ChangeCompanyStatusDeps,
  input: ChangeCompanyStatusInput,
): Promise<void> {
  const existing = await companies.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Company not found.", "COMPANY_NOT_FOUND")
  }
  if (existing.status === input.status) return

  await companies.setStatus(input.tenantId, input.id, input.status)

  const deactivated = input.status === "inactive"
  await audit.append({
    eventType: deactivated ? "crm.company.deactivated" : "crm.company.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "company",
    subjectId: input.id,
    action: deactivated ? "company.deactivated" : "company.updated",
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  })
}
