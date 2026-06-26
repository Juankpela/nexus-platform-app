import type {
  AuditEntry,
  AuditEntryWithSubject,
  AuditWindowEntry,
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
  /**
   * Events for a tenant within [start, end] (ISO-8601), newest first,
   * optionally filtered to a set of event types. The observation seam for
   * N-LABS Continuous Improvement; read-only, never mutates.
   */
  listByTenantWindow(
    tenantId: UUID,
    start: string,
    end: string,
    eventTypes?: readonly string[],
    limit?: number,
  ): Promise<AuditWindowEntry[]>
}
