import type { ApiKey, ApiKeyStatus, KeyPrefix } from "@/modules/api/domain/api-key"
import type { UUID } from "@/types/shared"

export type NewApiKeyRecord = {
  tenantId: UUID
  prefix: KeyPrefix
  keyHash: string
  label: string
  scopes: string[]
}

export interface ApiKeyRepository {
  /** Resolve a key by its hash (service role). Null if not found. */
  findByHash(keyHash: string): Promise<ApiKey | null>
  create(record: NewApiKeyRecord): Promise<ApiKey>
  touchLastUsed(id: UUID): Promise<void>
  setStatus(id: UUID, status: ApiKeyStatus): Promise<void>
}
