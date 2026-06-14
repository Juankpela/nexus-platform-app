import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { CompanyImportRow } from "@/modules/crm/domain/company-import"
import type { UUID } from "@/types/shared"

export type ImportCompaniesDeps = {
  companies: CompanyRepository
  audit: AuditRepository
}

export type ImportCompaniesInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  rows: CompanyImportRow[]
}

export async function importCompanies(
  { companies, audit }: ImportCompaniesDeps,
  input: ImportCompaniesInput,
): Promise<ImportResult> {
  const result = await companies.importBatch(input.tenantId, input.rows)

  if (result.imported > 0) {
    await audit.append({
      eventType: "company.imported",
      actorType: "user",
      actorId: input.actorId,
      tenantId: input.tenantId,
      subjectType: "company",
      subjectId: input.actorId,
      action: "company.imported",
      metadata: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        total: input.rows.length,
      },
      requestId: input.requestId,
      source: "web",
    })
  }

  return result
}
