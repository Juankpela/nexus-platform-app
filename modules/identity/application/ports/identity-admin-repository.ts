import type { UUID } from "@/types/shared"

export type NewIdentityUserInput = {
  email: string
  password: string
  fullName: string | null
}

/**
 * Privileged identity operations that are not expressible through tenant RLS
 * because they read or write the auth provider's user store. Implementations
 * MUST be server-only and callers MUST authorize before invoking.
 */
export interface IdentityAdminRepository {
  /** Resolve emails for the given user ids. Missing users are omitted. */
  getEmailsByIds(userIds: UUID[]): Promise<Map<UUID, string | null>>

  /**
   * Creates an authentication user with a confirmed email and a temporary
   * password. Returns the new user id. Throws ApplicationError("EMAIL_TAKEN")
   * if the email is already registered.
   */
  createUser(input: NewIdentityUserInput): Promise<UUID>
}
