import "server-only"

import { cache } from "react"

import { authenticate } from "@/modules/identity/application/use-cases/authenticate"
import { endSession } from "@/modules/identity/application/use-cases/end-session"
import { getCurrentUser } from "@/modules/identity/application/use-cases/get-current-user"
import { SupabaseAuthRepository } from "@/modules/identity/infrastructure/supabase-auth-repository"

function authRepo() {
  return new SupabaseAuthRepository()
}

export const getCachedCurrentUser = cache(() => getCurrentUser(authRepo()))

export function loginUser(credentials: unknown) {
  return authenticate(authRepo(), credentials)
}

export function endUserSession() {
  return endSession(authRepo())
}
