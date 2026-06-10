import { ApplicationError } from "@/lib/errors/application-error"
import type { ApiKeyRepository } from "@/modules/api/application/ports/api-key-repository"
import {
  isKeyUsable,
  parsePresentedKey,
  type ApiContext,
} from "@/modules/api/domain/api-key"

export type ResolveApiContextDeps = {
  apiKeys: ApiKeyRepository
  hashKey: (fullKey: string) => string
}

/**
 * Authenticate a public-API request from its `Authorization: Bearer <key>` header.
 * Fast-rejects on a missing/invalid env prefix BEFORE any DB lookup (ADR-025 #14).
 * Always throws UNAUTHORIZED (never leaks whether the key exists) on any failure.
 */
export async function resolveApiContext(
  { apiKeys, hashKey }: ResolveApiContextDeps,
  authorizationHeader: string | null,
  now: string,
): Promise<ApiContext> {
  const raw = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null
  if (!raw) throw new ApplicationError("Missing API key.", "UNAUTHORIZED")

  const parsed = parsePresentedKey(raw)
  if (!parsed) throw new ApplicationError("Malformed API key.", "UNAUTHORIZED")

  const key = await apiKeys.findByHash(hashKey(raw))
  if (!key || key.prefix !== parsed.prefix || !isKeyUsable(key, now)) {
    throw new ApplicationError("Invalid API key.", "UNAUTHORIZED")
  }

  // Best-effort usage stamp; never blocks the request.
  void apiKeys.touchLastUsed(key.id).catch(() => {})

  return {
    apiKeyId: key.id,
    tenantId: key.tenantId,
    prefix: key.prefix,
    scopes: key.scopes,
  }
}
