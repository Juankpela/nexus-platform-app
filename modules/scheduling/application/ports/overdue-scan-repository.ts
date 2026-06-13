import type { AlertSeverity } from "@/modules/scheduling/domain/overdue"
import type { UUID } from "@/types/shared"

/** Minimal projection the scanner reads to classify a work order's SLA timing. */
export type ScanWorkOrderRow = {
  id: UUID
  status: string
  scheduledEnd: string | null
  slaDueAt: string
}

/** Current dedup-cursor row for a work order. */
export type AlertStateRow = {
  workOrderId: UUID
  severity: AlertSeverity
}

/**
 * Port for the overdue scanner. Implemented with the SERVICE-ROLE (admin)
 * client: the scanner runs from a cron with no user session and writes the
 * cursor that authenticated users may not write (RLS). All methods are
 * tenant-scoped except `listActiveTenantIds`, which drives the per-tenant loop.
 *
 * The write methods are CONDITIONAL and return whether they actually changed
 * state, so the use-case can gate audit emission on a real transition (exactly
 * -once in steady state, concurrency-safe without a lease — decision §10/D-B).
 */
export interface OverdueScanRepository {
  /** Active tenants to sweep, one scan unit each. */
  listActiveTenantIds(): Promise<UUID[]>

  /** Open WOs that carry an SLA deadline (matches the PR1 partial index). */
  listOpenWithSla(tenantId: UUID): Promise<ScanWorkOrderRow[]>

  /** Currently-degraded WOs for the tenant (the cursor). */
  listAlertState(tenantId: UUID): Promise<AlertStateRow[]>

  /** Insert a new cursor row. Returns false on PK conflict (someone else won). */
  insertAlert(
    tenantId: UUID,
    workOrderId: UUID,
    severity: AlertSeverity,
    atIso: string,
  ): Promise<boolean>

  /** Raise warning→critical, re-stamping last_alerted_at. Returns true iff 1 row moved. */
  escalateAlert(
    tenantId: UUID,
    workOrderId: UUID,
    atIso: string,
  ): Promise<boolean>

  /** Lower critical→warning WITHOUT re-stamping last_alerted_at. No emission. */
  downgradeAlert(tenantId: UUID, workOrderId: UUID): Promise<void>

  /** Recovery: remove the cursor row. Idempotent. */
  deleteAlert(tenantId: UUID, workOrderId: UUID): Promise<void>
}
