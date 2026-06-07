import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type {
  IdentityProvisioningRepository,
  NewUserInput,
} from "@/modules/platform/application/ports/identity-provisioning-repository"
import type { UUID } from "@/types/shared"

/**
 * Creates auth users via the service-role admin API. This bypasses RLS by
 * design, so callers MUST authorize as a platform admin first (enforced by the
 * provision_organization RPC and the /platform guard). Creating a user with a
 * password is only possible through Supabase Auth's admin API — there is no
 * RLS-respecting path for it.
 */
export class SupabaseIdentityProvisioningRepository
  implements IdentityProvisioningRepository
{
  async createUser(input: NewUserInput): Promise<UUID> {
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
        "Unable to create the administrator account.",
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
