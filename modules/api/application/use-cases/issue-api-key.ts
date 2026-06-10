import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ApiKeyRepository } from "@/modules/api/application/ports/api-key-repository"
import { API_SCOPES, type ApiKey, type KeyPrefix } from "@/modules/api/domain/api-key"
import type { UUID } from "@/types/shared"

export type IssueApiKeyDeps = {
  apiKeys: ApiKeyRepository
  audit: AuditRepository
  /** Generates a full key for the prefix and its storage hash. */
  generate: (prefix: KeyPrefix) => { fullKey: string; keyHash: string }
}

export type IssueApiKeyInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  prefix: KeyPrefix
  label: string
  scopes: string[]
}

/**
 * Issue a new API key. Scopes are DENY-BY-DEFAULT (ADR-025 #16): only the explicit,
 * known scopes provided are granted (unknown scopes are rejected). The full key is
 * returned ONCE; only its hash is stored.
 */
export async function issueApiKey(
  { apiKeys, audit, generate }: IssueApiKeyDeps,
  input: IssueApiKeyInput,
): Promise<{ key: ApiKey; fullKey: string }> {
  const unknown = input.scopes.filter(
    (s) => !(API_SCOPES as readonly string[]).includes(s),
  )
  if (unknown.length > 0) {
    throw new ApplicationError(`Unknown scope(s): ${unknown.join(", ")}`, "INVALID_REQUEST")
  }

  const { fullKey, keyHash } = generate(input.prefix)
  const key = await apiKeys.create({
    tenantId: input.tenantId,
    prefix: input.prefix,
    keyHash,
    label: input.label,
    scopes: input.scopes, // may be [] — deny-by-default
  })

  await audit.append({
    eventType: "api.key_issued",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "api_key",
    subjectId: key.id,
    action: "api.key_issued",
    metadata: { prefix: input.prefix, scopes: input.scopes, label: input.label },
    requestId: input.requestId,
    source: "api",
  })

  return { key, fullKey }
}
