import { describe, expect, it } from "vitest"

import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { AssetImportRow } from "@/modules/service/domain/asset-import"
import { importAssets } from "@/modules/service/application/use-cases/import-assets"

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

function fakeAssets(result: ImportResult) {
  const calls: { tenantId: string; createdBy: string; rows: AssetImportRow[] }[] = []
  const repo = {
    async importBatch(tenantId: string, params: { createdBy: string; rows: AssetImportRow[] }) {
      calls.push({ tenantId, createdBy: params.createdBy, rows: params.rows })
      return result
    },
  } as unknown as AssetRepository
  return { repo, calls }
}

const input = {
  actorId: "11111111-1111-1111-1111-111111111111",
  tenantId: "22222222-2222-2222-2222-222222222222",
  requestId: "33333333-3333-3333-3333-333333333333",
  rows: [{ name: "AC Sala" } as AssetImportRow],
}

describe("importAssets", () => {
  it("delegates with createdBy and returns the result", async () => {
    const assets = fakeAssets({ imported: 1, skipped: 0, errors: [] })
    const audit = fakeAudit()
    const result = await importAssets({ assets: assets.repo, audit: audit.repo }, input)
    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] })
    expect(assets.calls[0]).toMatchObject({ tenantId: input.tenantId, createdBy: input.actorId })
  })

  it("audits when at least one imported", async () => {
    const assets = fakeAssets({ imported: 2, skipped: 1, errors: [] })
    const audit = fakeAudit()
    await importAssets({ assets: assets.repo, audit: audit.repo }, input)
    expect(audit.events).toHaveLength(1)
    expect(audit.events[0].eventType).toBe("asset.imported")
    expect(audit.events[0].metadata).toMatchObject({ imported: 2, skipped: 1 })
  })

  it("does not audit when nothing imported", async () => {
    const assets = fakeAssets({ imported: 0, skipped: 0, errors: [{ row: 1, message: "x" }] })
    const audit = fakeAudit()
    await importAssets({ assets: assets.repo, audit: audit.repo }, input)
    expect(audit.events).toHaveLength(0)
  })
})
