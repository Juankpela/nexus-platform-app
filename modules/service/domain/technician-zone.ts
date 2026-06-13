import type { UUID } from "@/types/shared"

/** A service zone covered by a technician. */
export type TechnicianZone = {
  zoneId: UUID
  zoneName: string
  createdAt: string
  updatedAt: string
}
