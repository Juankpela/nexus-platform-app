import { describe, expect, it, vi } from "vitest"

import type { ApiKeyRepository } from "@/modules/api/application/ports/api-key-repository"
import { resolveApiContext } from "@/modules/api/application/use-cases/resolve-api-context"
import type { ApiKey } from "@/modules/api/domain/api-key"

const NOW = "2026-06-10T12:00:00.000Z"
const TENANT = "11111111-1111-1111-1111-111111111111"

function key(over: Partial<ApiKey> = {}): ApiKey {
  return {
    id: "key-1", tenantId: TENANT, prefix: "nxs_live", label: "test",
    scopes: ["materials:read"], status: "active", expiresAt: null,
    lastUsedAt: null, createdAt: NOW, ...over,
  }
}

// hashKey = identity for the test; repo keyed by the raw presented key.
function deps(stored: ApiKey | null) {
  const findByHash = vi.fn().mockResolvedValue(stored)
  const touchLastUsed = vi.fn().mockResolvedValue(undefined)
  const apiKeys = { findByHash, touchLastUsed, create: vi.fn(), setStatus: vi.fn() } as unknown as ApiKeyRepository
  return { deps: { apiKeys, hashKey: (k: string) => k }, findByHash, touchLastUsed }
}

const hdr = (raw: string) => `Bearer ${raw}`

describe("resolveApiContext", () => {
  it("resolves a valid key to a context with scopes", async () => {
    const d = deps(key())
    const ctx = await resolveApiContext(d.deps, hdr("nxs_live_secret"), NOW)
    expect(ctx).toMatchObject({ apiKeyId: "key-1", tenantId: TENANT, prefix: "nxs_live", scopes: ["materials:read"] })
    expect(d.touchLastUsed).toHaveBeenCalledWith("key-1")
  })

  it("rejects a missing header", async () => {
    const d = deps(null)
    await expect(resolveApiContext(d.deps, null, NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    expect(d.findByHash).not.toHaveBeenCalled() // fast reject, no DB
  })

  it("fast-rejects an invalid prefix before DB lookup (#14)", async () => {
    const d = deps(key())
    await expect(resolveApiContext(d.deps, hdr("sk_live_secret"), NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    expect(d.findByHash).not.toHaveBeenCalled()
  })

  it("rejects an unknown key", async () => {
    const d = deps(null)
    await expect(resolveApiContext(d.deps, hdr("nxs_live_secret"), NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("rejects a revoked key", async () => {
    const d = deps(key({ status: "revoked" }))
    await expect(resolveApiContext(d.deps, hdr("nxs_live_secret"), NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("rejects an expired key", async () => {
    const d = deps(key({ expiresAt: "2026-01-01T00:00:00Z" }))
    await expect(resolveApiContext(d.deps, hdr("nxs_live_secret"), NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("rejects a prefix/record mismatch (test key presented, live record)", async () => {
    const d = deps(key({ prefix: "nxs_live" }))
    await expect(resolveApiContext(d.deps, hdr("nxs_test_secret"), NOW)).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
