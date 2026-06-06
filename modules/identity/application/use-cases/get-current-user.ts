import type { AuthRepository } from "@/modules/identity/application/ports/auth-repository"

export async function getCurrentUser(repository: AuthRepository) {
  return repository.getCurrentUser()
}
