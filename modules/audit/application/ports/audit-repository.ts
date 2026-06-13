import type {
  AuditEntry,
  AuditEntryWithSubject,
} from "@/modules/audit/domain/audit-entry"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { UUID } from "@/types/shared"

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>
  listBySubject(
    tenantId: UUID,
    subjectId: string,
    limit: number,
  ): Promise<AuditEntry[]>
  /** Recent events of a given type for the tenant, newest first. */
  listRecentByEventType(
    tenantId: UUID,
    eventType: string,
    limit: number,
  ): Promise<AuditEntryWithSubject[]>
}
