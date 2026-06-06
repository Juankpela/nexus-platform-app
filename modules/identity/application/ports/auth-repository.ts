import type { AuthUser, Credentials } from "@/modules/identity/domain/auth-user"

export interface AuthRepository {
  signIn(credentials: Credentials): Promise<AuthUser>
  signOut(): Promise<void>
  getCurrentUser(): Promise<AuthUser | null>
}
