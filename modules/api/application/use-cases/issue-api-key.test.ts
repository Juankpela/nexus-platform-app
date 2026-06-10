import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ApiKeyRepository } from "@/modules/api/application/ports/api-key-repository"
import { issueApiKey } from "@/modules/api/application/use-cases/issue-api-key"

const TENANT = "11111111-1111-1111-1111-111111111111"

function setup() {
  const create = vi.fn(async (r) => ({
    id: "key-1", tenantId: r.tenantId, prefix: r.prefix, label: r.label,
    scopes: r.scopes, status: "active" as const, expiresAt: null, lastUsedAt: null, createdAt: "t",
  }))
  const append = vi.fn().mockResolvedValue(undefined)
  const apiKeys = { create, findByHash: vi.fn(), touchLastUsed: vi.fn(), setStatus: vi.fn() } as unknown as ApiKeyRepository
  const audit = { append } as unknown as AuditRepository
  const generate = vi.fn(() => ({ fullKey: "nxs_live_secret", keyHash: "hash" }))
  return { deps: { apiKeys, audit, generate }, create, append }
}

const input = (scopes: string[]) => ({
  actorId: "u1", tenantId: TENANT, requestId: "r1", prefix: "nxs_live" as const, label: "ERP", scopes,
})

describe("issueApiKey", () => {
  it("allows deny-by-default (0 scopes) and returns the full key once", async () => {
    const s = setup()
    const { key, fullKey } = await issueApiKey(s.deps, input([]))
    expect(key.scopes).toEqual([])
    expect(fullKey).toBe("nxs_live_secret")
    expect(s.append).toHaveBeenCalledWith(expect.objectContaining({ action: "api.key_issued" }))
  })

  it("grants only explicit known scopes", async () => {
    const s = setup()
    const { key } = await issueApiKey(s.deps, input(["materials:read"]))
    expect(key.scopes).toEqual(["materials:read"])
  })

  it("rejects unknown scopes", async () => {
    const s = setup()
    await expect(issueApiKey(s.deps, input(["materials:write"]))).rejects.toMatchObject({ code: "INVALID_REQUEST" })
    expect(s.create).not.toHaveBeenCalled()
  })
})
