import type { UUID } from "@/types/shared"

export type AuthUser = {
  id: UUID
  email: string | null
}

export type Credentials = {
  email: string
  password: string
}
