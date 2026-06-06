import type { Json } from "@/types/database"

/** A read-projection of an audit event (for display purposes). */
export type AuditEntry = {
  id: string
  eventType: string
  actorId: string | null
  actorType: string
  action: string
  metadata: Json
  occurredAt: string
}
