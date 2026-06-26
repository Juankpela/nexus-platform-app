import { describe, expect, it } from "vitest"

import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { CompanyRepository } from "@/modules/crm/application/ports/company-repository"
import type { CompanyImportRow } from "@/modules/crm/domain/company-import"
import { importCompanies } from "@/modules/crm/application/use-cases/import-companies"

function fakeAudit() {
  const events: AuditEvent[] = []
  const repo: AuditRepository = {
    async append(event) {
      events.push(event)
    },
    async listBySubject() {
      return []
    },
    async listRecentByEventType() {
      return []
    },
    async listByTenantWindow() {
      return []
    },
  }
  return { repo, events }
}

function fakeCompanies(result: ImportResult): {
  repo: CompanyRepository
  calls: { tenantId: string; rows: CompanyImportRow[] }[]
} {
  const calls: { tenantId: string; rows: CompanyImportRow[] }[] = []
  const repo = {
    async importBatch(tenantId: string, rows: CompanyImportRow[]) {
      calls.push({ tenantId, rows })
      return result
    },
  } as unknown as CompanyRepository
  return { repo, calls }
}

const input = {
  actorId: "11111111-1111-1111-1111-111111111111",
  tenantId: "22222222-2222-2222-2222-222222222222",
  requestId: "33333333-3333-3333-3333-333333333333",
  rows: [{ name: "Acme", taxId: "900-1" } as CompanyImportRow],
}

describe("importCompanies", () => {
  it("delegates to the repository and returns its result", async () => {
    const companies = fakeCompanies({ imported: 1, skipped: 0, errors: [] })
    const audit = fakeAudit()

    const result = await importCompanies(
      { companies: companies.repo, audit: audit.repo },
      input,
    )

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    expect(companies.calls).toHaveLength(1)
    expect(companies.calls[0].tenantId).toBe(input.tenantId)
  })

  it("appends an audit event when at least one row imported", async () => {
    const companies = fakeCompanies({ imported: 2, skipped: 1, errors: [] })
    const audit = fakeAudit()

    await importCompanies(
      { companies: companies.repo, audit: audit.repo },
      input,
    )

    expect(audit.events).toHaveLength(1)
    expect(audit.events[0].eventType).toBe("company.imported")
    expect(audit.events[0].metadata).toMatchObject({
      imported: 2,
      skipped: 1,
      errors: 0,
    })
  })

  it("does not audit when nothing was imported", async () => {
    const companies = fakeCompanies({
      imported: 0,
      skipped: 0,
      errors: [{ row: 1, message: "x" }],
    })
    const audit = fakeAudit()

    await importCompanies(
      { companies: companies.repo, audit: audit.repo },
      input,
    )

    expect(audit.events).toHaveLength(0)
  })
})
