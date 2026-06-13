import type { UUID } from "@/types/shared"

/** Tenant-configurable service zone (geographic coverage label). */
export type Zone = {
  id: UUID
  name: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ZoneInput = {
  name: string
}
