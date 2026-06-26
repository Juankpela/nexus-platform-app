import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type {
  AuditEntry,
  AuditEntryWithSubject,
  AuditWindowEntry,
} from "@/modules/audit/domain/audit-entry"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import { resolveAuditWindow } from "@/modules/audit/domain/audit-window"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type AuditClientFactory = () =>
  | Promise<SupabaseClient<Database>>
  | SupabaseClient<Database>

export class SupabaseAuditRepository implements AuditRepository {
  /**
   * Defaults to the cookie-based server client (user-initiated writes). Pass an
   * admin-client factory for service-role contexts with no user session (e.g.
   * the overdue scanner cron), where the server client cannot satisfy RLS.
   */
  constructor(
    private readonly createClient: AuditClientFactory = createServerSupabaseClient,
  ) {}

  async append(event: AuditEvent): Promise<void> {
    const client = await this.createClient()
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
    const client = await this.createClient()
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

  async listRecentByEventType(
    tenantId: UUID,
    eventType: string,
    limit: number,
  ): Promise<AuditEntryWithSubject[]> {
    const client = await this.createClient()
    const { data, error } = await client
      .from("audit_events")
      .select(
        "id, event_type, actor_id, actor_type, action, metadata, occurred_at, subject_id",
      )
      .eq("tenant_id", tenantId)
      .eq("event_type", eventType)
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (error) {
      throw new ApplicationError(
        "Unable to load audit feed.",
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
      subjectId: row.subject_id,
    }))
  }

  async listByTenantWindow(
    tenantId: UUID,
    start: string,
    end: string,
    eventTypes?: readonly string[],
    limit?: number,
  ): Promise<AuditWindowEntry[]> {
    const window = resolveAuditWindow({ start, end, eventTypes, limit })
    const client = await this.createClient()

    let query = client
      .from("audit_events")
      .select(
        "id, event_type, actor_id, actor_type, action, metadata, occurred_at, subject_id, subject_type",
      )
      .eq("tenant_id", tenantId)
      .gte("occurred_at", window.startISO)
      .lte("occurred_at", window.endISO)

    if (window.eventTypes.length > 0) {
      query = query.in("event_type", window.eventTypes)
    }

    const { data, error } = await query
      .order("occurred_at", { ascending: false })
      .limit(window.limit)

    if (error) {
      throw new ApplicationError(
        "Unable to load audit window.",
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
      subjectId: row.subject_id,
      subjectType: row.subject_type,
    }))
  }
}
