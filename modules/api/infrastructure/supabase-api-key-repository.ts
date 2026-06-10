import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type {
  ApiKeyRepository,
  NewApiKeyRecord,
} from "@/modules/api/application/ports/api-key-repository"
import type { ApiKey, ApiKeyStatus, KeyPrefix } from "@/modules/api/domain/api-key"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type Row = Database["public"]["Tables"]["api_keys"]["Row"]

function toApiKey(row: Row): ApiKey {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    prefix: row.prefix as KeyPrefix,
    label: row.label,
    scopes: row.scopes,
    status: row.status,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }
}

/** Service-role repo — the public API has no user session (ADR-025 worker exception). */
export class SupabaseApiKeyRepository implements ApiKeyRepository {
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .maybeSingle()
    if (error) {
      throw new ApplicationError("Unable to resolve API key.", "API_KEY_LOOKUP_FAILED", error)
    }
    return data ? toApiKey(data) : null
  }

  async create(record: NewApiKeyRecord): Promise<ApiKey> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from("api_keys")
      .insert({
        tenant_id: record.tenantId,
        prefix: record.prefix,
        key_hash: record.keyHash,
        label: record.label,
        scopes: record.scopes,
      })
      .select("*")
      .single()
    if (error || !data) {
      throw new ApplicationError("Unable to create API key.", "API_KEY_CREATE_FAILED", error)
    }
    return toApiKey(data)
  }

  async touchLastUsed(id: UUID): Promise<void> {
    const admin = createAdminSupabaseClient()
    await admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id)
  }

  async setStatus(id: UUID, status: ApiKeyStatus): Promise<void> {
    const admin = createAdminSupabaseClient()
    const { error } = await admin.from("api_keys").update({ status }).eq("id", id)
    if (error) {
      throw new ApplicationError("Unable to update API key.", "API_KEY_UPDATE_FAILED", error)
    }
  }
}
