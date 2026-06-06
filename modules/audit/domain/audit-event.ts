import type { Json } from "@/types/database"
import type { UUID } from "@/types/shared"

export type AuditEvent = {
  eventType: string
  actorType: "user" | "system" | "service"
  actorId?: UUID | null
  tenantId?: UUID | null
  subjectType?: string | null
  subjectId?: string | null
  action: string
  metadata?: Json
  requestId?: UUID | null
  source?: string
}
