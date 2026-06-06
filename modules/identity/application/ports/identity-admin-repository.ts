import type { UUID } from "@/types/shared"

/**
 * Privileged identity lookups that are not expressible through tenant RLS
 * because they read the auth provider's user store. Implementations MUST be
 * server-only and callers MUST authorize before invoking.
 */
export interface IdentityAdminRepository {
  /** Resolve emails for the given user ids. Missing users are omitted. */
  getEmailsByIds(userIds: UUID[]): Promise<Map<UUID, string | null>>
}
