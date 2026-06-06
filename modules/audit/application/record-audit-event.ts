import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"

export async function recordAuditEvent(
  repository: AuditRepository,
  event: AuditEvent,
) {
  await repository.append(event)
}
