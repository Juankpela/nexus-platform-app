import { describe, expect, it } from "vitest"

import {
  hasScope,
  isKeyUsable,
  parsePresentedKey,
} from "@/modules/api/domain/api-key"

describe("parsePresentedKey (env prefix, ADR-025 #14)", () => {
  it("accepts live and test prefixes", () => {
    expect(parsePresentedKey("nxs_live_abc123")).toEqual({ prefix: "nxs_live", secret: "abc123" })
    expect(parsePresentedKey("nxs_test_xyz")).toEqual({ prefix: "nxs_test", secret: "xyz" })
  })
  it("rejects unknown/missing prefixes and empty secrets", () => {
    expect(parsePresentedKey("sk_live_abc")).toBeNull()
    expect(parsePresentedKey("nxs_prod_abc")).toBeNull()
    expect(parsePresentedKey("nxs_live_")).toBeNull()
    expect(parsePresentedKey("randomtoken")).toBeNull()
  })
})

describe("hasScope (deny-by-default, ADR-025 #16)", () => {
  it("grants only explicit scopes", () => {
    expect(hasScope([], "materials:read")).toBe(false)
    expect(hasScope(["companies:read"], "materials:read")).toBe(false)
    expect(hasScope(["materials:read"], "materials:read")).toBe(true)
  })
})

describe("isKeyUsable", () => {
  const now = "2026-06-10T12:00:00.000Z"
  it("true for active, non-expired", () => {
    expect(isKeyUsable({ status: "active", expiresAt: null }, now)).toBe(true)
    expect(isKeyUsable({ status: "active", expiresAt: "2027-01-01T00:00:00Z" }, now)).toBe(true)
  })
  it("false for revoked or expired", () => {
    expect(isKeyUsable({ status: "revoked", expiresAt: null }, now)).toBe(false)
    expect(isKeyUsable({ status: "active", expiresAt: "2026-01-01T00:00:00Z" }, now)).toBe(false)
  })
})
