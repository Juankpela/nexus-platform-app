import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { ApplicationError } from "@/lib/errors/application-error"
import type {
  IdentityAdminRepository,
  NewIdentityUserInput,
} from "@/modules/identity/application/ports/identity-admin-repository"
import type { UUID } from "@/types/shared"

/**
 * Reads and writes the auth provider's user store using the service role.
 * This bypasses RLS by design, so every caller MUST authorize first. Lookups
 * are performed per id (precise, no over-fetching of the global user list).
 */
export class SupabaseIdentityAdminRepository implements IdentityAdminRepository {
  async getEmailsByIds(userIds: UUID[]): Promise<Map<UUID, string | null>> {
    const result = new Map<UUID, string | null>()
    if (userIds.length === 0) return result

    const admin = createAdminSupabaseClient()
    const uniqueIds = Array.from(new Set(userIds))

    await Promise.all(
      uniqueIds.map(async (id) => {
        const { data, error } = await admin.auth.admin.getUserById(id)
        if (error) {
          throw new ApplicationError(
            "Unable to resolve member identities.",
            "IDENTITY_LOOKUP_FAILED",
            error,
          )
        }
        result.set(id, data.user?.email ?? null)
      }),
    )

    return result
  }

  async createUser(input: NewIdentityUserInput): Promise<UUID> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: input.fullName ? { full_name: input.fullName } : undefined,
    })

    if (error) {
      const taken = /already.+registered|already.+exists/i.test(error.message)
      throw new ApplicationError(
        "Unable to create the user account.",
        taken ? "EMAIL_TAKEN" : "USER_CREATE_FAILED",
        error,
      )
    }
    if (!data.user) {
      throw new ApplicationError(
        "User creation returned no account.",
        "USER_CREATE_FAILED",
      )
    }

    return data.user.id
  }
}
