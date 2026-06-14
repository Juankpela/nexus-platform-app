import { describe, expect, it } from "vitest"

import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { ContactImportRow } from "@/modules/crm/domain/contact-import"
import { importContacts } from "@/modules/crm/application/use-cases/import-contacts"

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
  }
  return { repo, events }
}

function fakeContacts(result: ImportResult) {
  const calls: { tenantId: string; rows: ContactImportRow[] }[] = []
  const repo = {
    async importBatch(tenantId: string, rows: ContactImportRow[]) {
      calls.push({ tenantId, rows })
      return result
    },
  } as unknown as ContactRepository
  return { repo, calls }
}

const input = {
  actorId: "11111111-1111-1111-1111-111111111111",
  tenantId: "22222222-2222-2222-2222-222222222222",
  requestId: "33333333-3333-3333-3333-333333333333",
  rows: [{ firstName: "María" } as ContactImportRow],
}

describe("importContacts", () => {
  it("delegates to the repository and returns its result", async () => {
    const contacts = fakeContacts({ imported: 1, skipped: 0, errors: [] })
    const audit = fakeAudit()

    const result = await importContacts(
      { contacts: contacts.repo, audit: audit.repo },
      input,
    )

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    expect(contacts.calls[0].tenantId).toBe(input.tenantId)
  })

  it("audits when at least one row imported", async () => {
    const contacts = fakeContacts({ imported: 3, skipped: 1, errors: [] })
    const audit = fakeAudit()

    await importContacts({ contacts: contacts.repo, audit: audit.repo }, input)

    expect(audit.events).toHaveLength(1)
    expect(audit.events[0].eventType).toBe("contact.imported")
    expect(audit.events[0].metadata).toMatchObject({ imported: 3, skipped: 1 })
  })

  it("does not audit when nothing imported", async () => {
    const contacts = fakeContacts({
      imported: 0,
      skipped: 0,
      errors: [{ row: 1, message: "x" }],
    })
    const audit = fakeAudit()

    await importContacts({ contacts: contacts.repo, audit: audit.repo }, input)

    expect(audit.events).toHaveLength(0)
  })
})
