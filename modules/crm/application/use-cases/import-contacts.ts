import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { ContactImportRow } from "@/modules/crm/domain/contact-import"
import type { UUID } from "@/types/shared"

export type ImportContactsDeps = {
  contacts: ContactRepository
  audit: AuditRepository
}

export type ImportContactsInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  rows: ContactImportRow[]
}

export async function importContacts(
  { contacts, audit }: ImportContactsDeps,
  input: ImportContactsInput,
): Promise<ImportResult> {
  const result = await contacts.importBatch(input.tenantId, input.rows)

  if (result.imported > 0) {
    await audit.append({
      eventType: "contact.imported",
      actorType: "user",
      actorId: input.actorId,
      tenantId: input.tenantId,
      subjectType: "contact",
      subjectId: input.actorId,
      action: "contact.imported",
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
