import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { OverdueScanRepository } from "@/modules/scheduling/application/ports/overdue-scan-repository"
import {
  classifyWorkOrderTiming,
  slaAlertSeverity,
  type AlertSeverity,
} from "@/modules/scheduling/domain/overdue"
import type { UUID } from "@/types/shared"

/** Single durable event type; the transition/severity live in metadata (PR6 reads them). */
export const SLA_ALERT_EVENT = "scheduling.work_order.sla_alert"

export type ScanDeps = {
  repo: OverdueScanRepository
  audit: AuditRepository
  /** One clock for the whole run (determinism). */
  nowMs: number
  /** Correlates every emission of a single batch. */
  requestId: UUID
  atRiskWindowMs?: number
}

export type TenantScanResult = {
  tenantId: UUID
  evaluated: number
  created: number
  escalated: number
  downgraded: number
  recovered: number
  emitted: number
  errors: number
  /** Sampled error messages for diagnosis (the cron has no console; this surfaces in the JSON). */
  errorSamples: string[]
}

export type ScanBatchResult = {
  tenants: number
  evaluated: number
  emitted: number
  recovered: number
  errors: number
  errorSamples: string[]
}

/** Cap on diagnostic samples returned — enough to spot a systemic failure, bounded payload. */
const MAX_ERROR_SAMPLES = 5

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

async function emit(
  deps: ScanDeps,
  tenantId: UUID,
  workOrderId: UUID,
  severity: AlertSeverity,
  slaState: string,
  slaDueAt: string,
  transition: "new" | "escalation",
): Promise<void> {
  await deps.audit.append({
    eventType: SLA_ALERT_EVENT,
    actorType: "system",
    actorId: null,
    tenantId,
    subjectType: "work_order",
    subjectId: workOrderId,
    action: "work_order.sla_alert",
    metadata: { severity, slaState, slaDueAt, transition },
    requestId: deps.requestId,
    source: "scheduling-scan",
  })
}

/**
 * Reconcile one tenant's open+SLA work orders against the dedup cursor.
 *
 * Pure orchestration over the port: classify each WO with the injected clock,
 * derive the SLA alert tier, then apply the minimal transition. Emission is
 * gated on the CONDITIONAL write actually changing state, and ordered
 * write-then-emit (at-most-once, decision D-B). Each WO is isolated in its own
 * try/catch so one failure never aborts the tenant (partial-failure safety).
 */
export async function scanTenantOverdue(
  deps: ScanDeps,
  tenantId: UUID,
): Promise<TenantScanResult> {
  const nowIso = new Date(deps.nowMs).toISOString()
  const result: TenantScanResult = {
    tenantId,
    evaluated: 0,
    created: 0,
    escalated: 0,
    downgraded: 0,
    recovered: 0,
    emitted: 0,
    errors: 0,
    errorSamples: [],
  }

  const workOrders = await deps.repo.listOpenWithSla(tenantId)
  result.evaluated = workOrders.length

  // Desired alert tier per WO (only WOs under SLA pressure appear here).
  const desired = new Map<UUID, { severity: AlertSeverity; slaState: string; slaDueAt: string }>()
  for (const wo of workOrders) {
    const timing = classifyWorkOrderTiming(
      { status: wo.status, scheduledEnd: wo.scheduledEnd, slaDueAt: wo.slaDueAt },
      { nowMs: deps.nowMs, atRiskWindowMs: deps.atRiskWindowMs },
    )
    const severity = slaAlertSeverity(timing.sla)
    if (severity) desired.set(wo.id, { severity, slaState: timing.sla, slaDueAt: wo.slaDueAt })
  }

  const existing = new Map<UUID, AlertSeverity>()
  for (const row of await deps.repo.listAlertState(tenantId)) {
    existing.set(row.workOrderId, row.severity)
  }

  // Degradations / escalations.
  for (const [workOrderId, target] of desired) {
    try {
      const prev = existing.get(workOrderId)
      if (!prev) {
        const wrote = await deps.repo.insertAlert(tenantId, workOrderId, target.severity, nowIso)
        if (wrote) {
          result.created += 1
          await emit(deps, tenantId, workOrderId, target.severity, target.slaState, target.slaDueAt, "new")
          result.emitted += 1
        }
      } else if (prev === "warning" && target.severity === "critical") {
        const wrote = await deps.repo.escalateAlert(tenantId, workOrderId, nowIso)
        if (wrote) {
          result.escalated += 1
          await emit(deps, tenantId, workOrderId, "critical", target.slaState, target.slaDueAt, "escalation")
          result.emitted += 1
        }
      } else if (prev === "critical" && target.severity === "warning") {
        await deps.repo.downgradeAlert(tenantId, workOrderId)
        result.downgraded += 1
      }
      // prev === target → no-op (this is the dedup).
    } catch (e) {
      // Per-WO isolation: a failed write/emit (incl. at-most-once audit loss on
      // crash) must not abort the rest of the tenant. Counted, then continue.
      result.errors += 1
      if (result.errorSamples.length < MAX_ERROR_SAMPLES) {
        result.errorSamples.push(`${workOrderId}: ${errMessage(e)}`)
      }
    }
  }

  // Recoveries: cursor rows whose WO is no longer under SLA pressure.
  for (const workOrderId of existing.keys()) {
    if (desired.has(workOrderId)) continue
    try {
      await deps.repo.deleteAlert(tenantId, workOrderId)
      result.recovered += 1
    } catch (e) {
      result.errors += 1
      if (result.errorSamples.length < MAX_ERROR_SAMPLES) {
        result.errorSamples.push(`${workOrderId}: ${errMessage(e)}`)
      }
    }
  }

  return result
}

/**
 * Sweep every active tenant. Per-tenant try/catch isolates blast radius: one
 * tenant's failure never aborts the batch — it is retried on the next tick
 * (retry = next cron run, no in-run retry).
 */
export async function scanOverdueWorkOrders(deps: ScanDeps): Promise<ScanBatchResult> {
  const tenantIds = await deps.repo.listActiveTenantIds()
  const batch: ScanBatchResult = {
    tenants: 0,
    evaluated: 0,
    emitted: 0,
    recovered: 0,
    errors: 0,
    errorSamples: [],
  }

  const pushSample = (sample: string) => {
    if (batch.errorSamples.length < MAX_ERROR_SAMPLES) batch.errorSamples.push(sample)
  }

  for (const tenantId of tenantIds) {
    try {
      const r = await scanTenantOverdue(deps, tenantId)
      batch.tenants += 1
      batch.evaluated += r.evaluated
      batch.emitted += r.emitted
      batch.recovered += r.recovered
      batch.errors += r.errors
      for (const s of r.errorSamples) pushSample(`${tenantId}/${s}`)
    } catch (e) {
      batch.errors += 1
      pushSample(`${tenantId}: ${errMessage(e)}`)
    }
  }

  return batch
}
