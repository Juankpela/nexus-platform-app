import { describe, expect, it } from "vitest"

import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type {
  AlertStateRow,
  OverdueScanRepository,
  ScanWorkOrderRow,
} from "@/modules/scheduling/application/ports/overdue-scan-repository"
import type { AlertSeverity } from "@/modules/scheduling/domain/overdue"
import {
  SLA_ALERT_EVENT,
  scanOverdueWorkOrders,
  scanTenantOverdue,
  type ScanDeps,
} from "@/modules/scheduling/application/use-cases/scan-overdue-work-orders"

const NOW = Date.parse("2026-06-13T12:00:00.000Z")
const HOUR = 60 * 60 * 1000
const T = "11111111-1111-1111-1111-111111111111"
const iso = (offset: number) => new Date(NOW + offset).toISOString()

type FakeOptions = {
  failInsertFor?: Set<string>
  insertConflictFor?: Set<string>
  escalateReturnsFalseFor?: Set<string>
}

class FakeRepo implements OverdueScanRepository {
  wos = new Map<string, ScanWorkOrderRow[]>()
  cursor = new Map<string, Map<string, AlertSeverity>>()
  calls: string[] = []

  constructor(private readonly opts: FakeOptions = {}) {}

  setWos(tenantId: string, rows: ScanWorkOrderRow[]) {
    this.wos.set(tenantId, rows)
  }
  setCursor(tenantId: string, entries: [string, AlertSeverity][]) {
    this.cursor.set(tenantId, new Map(entries))
  }
  private cur(tenantId: string) {
    let m = this.cursor.get(tenantId)
    if (!m) {
      m = new Map()
      this.cursor.set(tenantId, m)
    }
    return m
  }

  async listActiveTenantIds() {
    return [...this.wos.keys()]
  }
  async listOpenWithSla(tenantId: string) {
    return this.wos.get(tenantId) ?? []
  }
  async listAlertState(tenantId: string): Promise<AlertStateRow[]> {
    return [...this.cur(tenantId).entries()].map(([workOrderId, severity]) => ({
      workOrderId,
      severity,
    }))
  }
  async insertAlert(tenantId: string, woId: string, severity: AlertSeverity) {
    this.calls.push(`insert:${woId}:${severity}`)
    if (this.opts.failInsertFor?.has(woId)) throw new Error("insert boom")
    if (this.opts.insertConflictFor?.has(woId)) return false
    this.cur(tenantId).set(woId, severity)
    return true
  }
  async escalateAlert(tenantId: string, woId: string) {
    this.calls.push(`escalate:${woId}`)
    if (this.opts.escalateReturnsFalseFor?.has(woId)) return false
    this.cur(tenantId).set(woId, "critical")
    return true
  }
  async downgradeAlert(tenantId: string, woId: string) {
    this.calls.push(`downgrade:${woId}`)
    this.cur(tenantId).set(woId, "warning")
  }
  async deleteAlert(tenantId: string, woId: string) {
    this.calls.push(`delete:${woId}`)
    this.cur(tenantId).delete(woId)
  }
}

class FakeAudit {
  events: AuditEvent[] = []
  shouldThrow = false
  async append(event: AuditEvent) {
    if (this.shouldThrow) throw new Error("audit boom")
    this.events.push(event)
  }
  async listBySubject() {
    return []
  }
}

function deps(repo: OverdueScanRepository, audit: FakeAudit): ScanDeps {
  return { repo, audit, nowMs: NOW, requestId: "req-1", atRiskWindowMs: 2 * HOUR }
}

function wo(id: string, status: string, slaOffset: number | null, scheduledEnd: string | null = null): ScanWorkOrderRow {
  return { id, status, scheduledEnd, slaDueAt: slaOffset === null ? "" : iso(slaOffset) }
}

describe("scanTenantOverdue", () => {
  it("creates a critical cursor row and emits for a breached WO", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.created).toBe(1)
    expect(r.emitted).toBe(1)
    expect(repo.cursor.get(T)?.get("wo-1")).toBe("critical")
    expect(audit.events).toHaveLength(1)
    expect(audit.events[0].eventType).toBe(SLA_ALERT_EVENT)
    expect(audit.events[0].actorType).toBe("system")
    expect(audit.events[0].metadata).toMatchObject({ severity: "critical", transition: "new" })
  })

  it("creates a warning row for an at-risk WO", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", 1 * HOUR)])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(repo.cursor.get(T)?.get("wo-1")).toBe("warning")
    expect(audit.events[0].metadata).toMatchObject({ severity: "warning", transition: "new" })
    expect(r.emitted).toBe(1)
  })

  it("escalates warning→critical and emits exactly once", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "in_progress", -1 * HOUR)])
    repo.setCursor(T, [["wo-1", "warning"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.escalated).toBe(1)
    expect(r.emitted).toBe(1)
    expect(repo.cursor.get(T)?.get("wo-1")).toBe("critical")
    expect(audit.events[0].metadata).toMatchObject({ transition: "escalation", severity: "critical" })
  })

  it("does NOT emit when severity is unchanged (dedup)", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)]) // breached → critical
    repo.setCursor(T, [["wo-1", "critical"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.emitted).toBe(0)
    expect(audit.events).toHaveLength(0)
    expect(repo.calls).not.toContain("escalate:wo-1")
  })

  it("downgrades critical→warning without emitting", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", 1 * HOUR)]) // at_risk → warning
    repo.setCursor(T, [["wo-1", "critical"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.downgraded).toBe(1)
    expect(r.emitted).toBe(0)
    expect(repo.cursor.get(T)?.get("wo-1")).toBe("warning")
  })

  it("recovers (deletes) a WO that is no longer degraded", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", 10 * HOUR)]) // healthy
    repo.setCursor(T, [["wo-1", "critical"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.recovered).toBe(1)
    expect(r.emitted).toBe(0)
    expect(repo.cursor.get(T)?.has("wo-1")).toBe(false)
  })

  it("recovers an on_hold WO (paused clock) even with a past deadline", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "on_hold", -1 * HOUR)])
    repo.setCursor(T, [["wo-1", "critical"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.recovered).toBe(1)
    expect(repo.cursor.get(T)?.has("wo-1")).toBe(false)
  })

  it("does NOT emit when an insert loses the PK race (conflict)", async () => {
    const repo = new FakeRepo({ insertConflictFor: new Set(["wo-1"]) })
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.created).toBe(0)
    expect(r.emitted).toBe(0)
    expect(audit.events).toHaveLength(0)
  })

  it("does NOT emit when escalation was already done concurrently", async () => {
    const repo = new FakeRepo({ escalateReturnsFalseFor: new Set(["wo-1"]) })
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])
    repo.setCursor(T, [["wo-1", "warning"]])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.escalated).toBe(0)
    expect(r.emitted).toBe(0)
  })

  it("isolates a per-WO failure and keeps processing the rest", async () => {
    const repo = new FakeRepo({ failInsertFor: new Set(["wo-1"]) })
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR), wo("wo-2", "scheduled", -1 * HOUR)])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.errors).toBe(1)
    expect(r.created).toBe(1) // wo-2 still processed
    expect(repo.cursor.get(T)?.get("wo-2")).toBe("critical")
    expect(r.errorSamples).toHaveLength(1)
    expect(r.errorSamples[0]).toContain("wo-1")
  })

  it("caps error samples at the limit", async () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"]
    const repo = new FakeRepo({ failInsertFor: new Set(ids) })
    const audit = new FakeAudit()
    repo.setWos(T, ids.map((id) => wo(id, "scheduled", -1 * HOUR)))

    const r = await scanTenantOverdue(deps(repo, audit), T)

    expect(r.errors).toBe(7)
    expect(r.errorSamples.length).toBe(5) // capped
  })

  it("treats an audit failure as at-most-once loss without aborting the tenant", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    audit.shouldThrow = true
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR), wo("wo-2", "scheduled", -1 * HOUR)])

    const r = await scanTenantOverdue(deps(repo, audit), T)

    // Cursor was written (insert succeeded) before the throwing emit; both WOs counted as errors.
    expect(r.errors).toBe(2)
    expect(r.emitted).toBe(0)
    expect(repo.cursor.get(T)?.size).toBe(2)
  })

  it("is idempotent: a second identical run emits nothing new", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])

    await scanTenantOverdue(deps(repo, audit), T)
    const second = await scanTenantOverdue(deps(repo, audit), T)

    expect(second.emitted).toBe(0)
    expect(audit.events).toHaveLength(1)
  })
})

describe("scanOverdueWorkOrders (batch)", () => {
  it("aggregates across tenants and isolates a tenant failure", async () => {
    const repo = new FakeRepo()
    const audit = new FakeAudit()
    const T2 = "22222222-2222-2222-2222-222222222222"
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])
    repo.setWos(T2, [wo("wo-2", "scheduled", 1 * HOUR)])

    const batch = await scanOverdueWorkOrders(deps(repo, audit))

    expect(batch.tenants).toBe(2)
    expect(batch.evaluated).toBe(2)
    expect(batch.emitted).toBe(2)
    expect(batch.errorSamples).toHaveLength(0)
  })

  it("prefixes error samples with the tenant id", async () => {
    const repo = new FakeRepo({ failInsertFor: new Set(["wo-1"]) })
    const audit = new FakeAudit()
    repo.setWos(T, [wo("wo-1", "scheduled", -1 * HOUR)])

    const batch = await scanOverdueWorkOrders(deps(repo, audit))

    expect(batch.errors).toBe(1)
    expect(batch.errorSamples[0]).toContain(T)
    expect(batch.errorSamples[0]).toContain("wo-1")
  })
})
