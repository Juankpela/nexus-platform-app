import type { AuditEvent } from "@/modules/audit/domain/audit-event"

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>
}
