import type { UUID } from "@/types/shared"

export type NewUserInput = {
  email: string
  password: string
  fullName: string | null
}

export interface IdentityProvisioningRepository {
  /**
   * Creates an authentication user with a password and a confirmed email.
   * Returns the new user id. Throws ApplicationError("EMAIL_TAKEN") if the
   * email already exists.
   */
  createUser(input: NewUserInput): Promise<UUID>
}
