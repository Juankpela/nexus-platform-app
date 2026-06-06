import "server-only"

import { cache } from "react"

import { getCurrentUser } from "@/modules/identity/application/use-cases/get-current-user"
import { SupabaseAuthRepository } from "@/modules/identity/infrastructure/supabase-auth-repository"

export const getCachedCurrentUser = cache(() =>
  getCurrentUser(new SupabaseAuthRepository()),
)
