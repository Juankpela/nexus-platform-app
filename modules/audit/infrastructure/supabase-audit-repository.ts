import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEntry } from "@/modules/audit/domain/audit-entry"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { UUID } from "@/types/shared"

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

  async listBySubject(
    tenantId: UUID,
    subjectId: string,
    limit: number,
  ): Promise<AuditEntry[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("audit_events")
      .select(
        "id, event_type, actor_id, actor_type, action, metadata, occurred_at",
      )
      .eq("tenant_id", tenantId)
      .eq("subject_id", subjectId)
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new ApplicationError(
        "Unable to load audit history.",
        "AUDIT_READ_FAILED",
        error,
      )
    }

    return data.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      actorId: row.actor_id,
      actorType: row.actor_type,
      action: row.action,
      metadata: row.metadata,
      occurredAt: row.occurred_at,
    }))
  }
}
