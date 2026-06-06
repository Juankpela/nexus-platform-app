import { z } from "zod"

import type { AuthRepository } from "@/modules/identity/application/ports/auth-repository"

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
})

export async function authenticate(
  repository: AuthRepository,
  input: unknown,
) {
  return repository.signIn(credentialsSchema.parse(input))
}
