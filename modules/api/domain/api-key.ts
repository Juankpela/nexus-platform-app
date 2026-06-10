import type { UUID } from "@/types/shared"

/** Environment prefixes (ADR-025 #14). Validated BEFORE any DB lookup. */
export const KEY_PREFIXES = ["nxs_live", "nxs_test"] as const
export type KeyPrefix = (typeof KEY_PREFIXES)[number]

export type ApiKeyStatus = "active" | "revoked"

/** v1 scope catalog — INDEPENDENT of RBAC (ADR-025 #7), read-only. */
export const API_SCOPES = [
  "materials:read",
  "inventory:read",
  "companies:read",
  "contacts:read",
  "work_orders:read",
] as const
export type ApiScope = (typeof API_SCOPES)[number]

export type ApiKey = {
  id: UUID
  tenantId: UUID
  prefix: KeyPrefix
  label: string
  scopes: string[]
  status: ApiKeyStatus
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

/** The authenticated public-API caller context (no user session). */
export type ApiContext = {
  apiKeyId: UUID
  tenantId: UUID
  prefix: KeyPrefix
  scopes: string[]
}

export function isValidPrefix(value: string): value is KeyPrefix {
  return (KEY_PREFIXES as readonly string[]).includes(value)
}

/**
 * Split a presented key `nxs_live_<secret>` into prefix + secret. Returns null if the
 * prefix is missing/invalid — enables a fast reject before touching the DB (#14).
 */
export function parsePresentedKey(
  raw: string,
): { prefix: KeyPrefix; secret: string } | null {
  for (const p of KEY_PREFIXES) {
    if (raw.startsWith(`${p}_`)) {
      const secret = raw.slice(p.length + 1)
      return secret.length > 0 ? { prefix: p, secret } : null
    }
  }
  return null
}

/** Deny-by-default scope check (ADR-025 #16): a key grants only its explicit scopes. */
export function hasScope(keyScopes: string[], required: ApiScope): boolean {
  return keyScopes.includes(required)
}

/** Usable = active AND not expired. */
export function isKeyUsable(
  key: Pick<ApiKey, "status" | "expiresAt">,
  now: string,
): boolean {
  if (key.status !== "active") return false
  return key.expiresAt === null || key.expiresAt > now
}
