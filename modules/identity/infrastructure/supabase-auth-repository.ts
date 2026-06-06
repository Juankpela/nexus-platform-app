import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AuthRepository } from "@/modules/identity/application/ports/auth-repository"
import type { AuthUser, Credentials } from "@/modules/identity/domain/auth-user"

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(credentials: Credentials): Promise<AuthUser> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.auth.signInWithPassword(credentials)

    if (error || !data.user) {
      throw new ApplicationError(
        "The email or password is incorrect.",
        "INVALID_CREDENTIALS",
        error,
      )
    }

    return { id: data.user.id, email: data.user.email ?? null }
  }

  async signOut(): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client.auth.signOut()

    if (error) {
      throw new ApplicationError("Unable to sign out.", "SIGN_OUT_FAILED", error)
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.auth.getUser()

    if (error || !data.user) {
      return null
    }

    return { id: data.user.id, email: data.user.email ?? null }
  }
}
