import type { AuditEntry } from "@/modules/audit/domain/audit-entry"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { UUID } from "@/types/shared"

export interface AuditRepository {
  append(event: AuditEvent): Promise<void>
  listBySubject(
    tenantId: UUID,
    subjectId: string,
    limit: number,
  ): Promise<AuditEntry[]>
}
