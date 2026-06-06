import type { AuthRepository } from "@/modules/identity/application/ports/auth-repository"

export async function endSession(repository: AuthRepository) {
  await repository.signOut()
}
