import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ApplicationError } from "@/lib/errors/application-error"
import type {
  AlertStateRow,
  OverdueScanRepository,
  ScanWorkOrderRow,
} from "@/modules/scheduling/application/ports/overdue-scan-repository"
import type { AlertSeverity } from "@/modules/scheduling/domain/overdue"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

const PG_UNIQUE_VIOLATION = "23505"

/**
 * Service-role implementation of the overdue scanner port. Constructed with an
 * admin client (cron has no user session). Writes are conditional so the
 * use-case can gate emission on a real state change.
 */
export class SupabaseOverdueScanRepository implements OverdueScanRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listActiveTenantIds(): Promise<UUID[]> {
    const { data, error } = await this.client
      .from("tenants")
      .select("id")
      .eq("status", "active")

    if (error) {
      throw new ApplicationError("Unable to list tenants.", "SCAN_TENANTS_FAILED", error)
    }
    return (data ?? []).map((row) => row.id)
  }

  async listOpenWithSla(tenantId: UUID): Promise<ScanWorkOrderRow[]> {
    // Mirrors the PR1 partial index predicate exactly so the scan stays cheap:
    // open (not terminal) WOs that carry an SLA deadline.
    const { data, error } = await this.client
      .from("work_orders")
      .select("id, status, scheduled_end, sla_due_at")
      .eq("tenant_id", tenantId)
      .not("sla_due_at", "is", null)
      .not("status", "in", "(completed,cancelled)")

    if (error) {
      throw new ApplicationError("Unable to list open work orders.", "SCAN_WO_FAILED", error)
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      scheduledEnd: row.scheduled_end,
      slaDueAt: row.sla_due_at as string,
    }))
  }

  async listAlertState(tenantId: UUID): Promise<AlertStateRow[]> {
    const { data, error } = await this.client
      .from("work_order_alert_state")
      .select("work_order_id, last_alerted_severity")
      .eq("tenant_id", tenantId)

    if (error) {
      throw new ApplicationError("Unable to list alert state.", "SCAN_CURSOR_FAILED", error)
    }
    return (data ?? []).map((row) => ({
      workOrderId: row.work_order_id,
      severity: row.last_alerted_severity as AlertSeverity,
    }))
  }

  async insertAlert(
    tenantId: UUID,
    workOrderId: UUID,
    severity: AlertSeverity,
    atIso: string,
  ): Promise<boolean> {
    const { error } = await this.client.from("work_order_alert_state").insert({
      tenant_id: tenantId,
      work_order_id: workOrderId,
      last_alerted_severity: severity,
      last_alerted_at: atIso,
    })

    if (error) {
      // PK conflict = a concurrent run already inserted. Not an error: don't emit.
      if (error.code === PG_UNIQUE_VIOLATION) return false
      throw new ApplicationError("Unable to insert alert state.", "SCAN_INSERT_FAILED", error)
    }
    return true
  }

  async escalateAlert(tenantId: UUID, workOrderId: UUID, atIso: string): Promise<boolean> {
    // Conditional on the row still being 'warning' → concurrency-safe exactly-once.
    const { data, error } = await this.client
      .from("work_order_alert_state")
      .update({ last_alerted_severity: "critical", last_alerted_at: atIso })
      .eq("tenant_id", tenantId)
      .eq("work_order_id", workOrderId)
      .eq("last_alerted_severity", "warning")
      .select("work_order_id")

    if (error) {
      throw new ApplicationError("Unable to escalate alert state.", "SCAN_ESCALATE_FAILED", error)
    }
    return (data ?? []).length === 1
  }

  async downgradeAlert(tenantId: UUID, workOrderId: UUID): Promise<void> {
    // Lower the tier but keep last_alerted_at (no new emission). updated_at via trigger.
    const { error } = await this.client
      .from("work_order_alert_state")
      .update({ last_alerted_severity: "warning" })
      .eq("tenant_id", tenantId)
      .eq("work_order_id", workOrderId)
      .eq("last_alerted_severity", "critical")

    if (error) {
      throw new ApplicationError("Unable to downgrade alert state.", "SCAN_DOWNGRADE_FAILED", error)
    }
  }

  async deleteAlert(tenantId: UUID, workOrderId: UUID): Promise<void> {
    const { error } = await this.client
      .from("work_order_alert_state")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("work_order_id", workOrderId)

    if (error) {
      throw new ApplicationError("Unable to delete alert state.", "SCAN_DELETE_FAILED", error)
    }
  }
}
