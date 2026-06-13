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

/** Audit entry including the subject it concerns (for event-type feeds). */
export type AuditEntryWithSubject = AuditEntry & {
  subjectId: string | null
}
