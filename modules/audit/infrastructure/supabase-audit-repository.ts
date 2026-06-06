import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"

export class SupabaseAuditRepository implements AuditRepository {
  async append(event: AuditEvent): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client.from("audit_events").insert({
      event_type: event.eventType,
      actor_type: event.actorType,
      actor_id: event.actorId,
      tenant_id: event.tenantId,
      subject_type: event.subjectType,
      subject_id: event.subjectId,
      action: event.action,
      metadata: event.metadata ?? {},
      request_id: event.requestId,
      source: event.source ?? "web",
    })

    if (error) {
      throw new ApplicationError(
        "Unable to record audit event.",
        "AUDIT_WRITE_FAILED",
        error,
      )
    }
  }
}
