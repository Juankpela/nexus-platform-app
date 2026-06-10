import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExportJobRepository } from "@/modules/integrations/application/ports/export-job-repository"
import type { ExportRegistry } from "@/modules/integrations/application/ports/export-source"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ExportStorage } from "@/modules/integrations/application/ports/export-storage"
import { processExportJob } from "@/modules/integrations/application/use-cases/process-export-job"
import { runExportWorker } from "@/modules/integrations/application/use-cases/run-export-worker"
import type { ExportFormat } from "@/modules/integrations/domain/export-contract"
import type { ExportJob } from "@/modules/integrations/domain/export-job"

const TENANT = "11111111-1111-1111-1111-111111111111"

function job(over: Partial<ExportJob> = {}): ExportJob {
  return {
    id: "job-1", tenantId: TENANT, requestedBy: "u1", object: "materials", format: "csv",
    filters: {}, status: "processing", rowCount: null, storagePath: null, lastError: null,
    attemptCount: 1, leaseUntil: null, createdAt: "t", startedAt: "t", completedAt: null, expiresAt: null,
    ...over,
  }
}

function deps(over: {
  fetch?: () => Promise<{ rows: unknown[]; total: number }>
  markCompleted?: ReturnType<typeof vi.fn>
  markFailed?: ReturnType<typeof vi.fn>
  append?: ReturnType<typeof vi.fn>
} = {}) {
  const fetch = over.fetch ?? vi.fn(async () => ({ rows: [{ name: "a" }], total: 1 }))
  const workerRegistry = {
    get: () => ({ object: "materials" as const, label: "M", permission: "p",
      columns: [{ key: "name", header: "Name", accessor: (r: unknown) => (r as { name: string }).name }], fetch }),
  } as unknown as ExportRegistry
  const renderers = {
    csv: { format: "csv", render: vi.fn(async () => new Uint8Array([1])) },
    xlsx: { format: "xlsx", render: vi.fn(async () => new Uint8Array([1])) },
  } as unknown as Record<ExportFormat, ExportRenderer>
  const markCompleted = over.markCompleted ?? vi.fn().mockResolvedValue(true)
  const markFailed = over.markFailed ?? vi.fn().mockResolvedValue(true)
  const upload = vi.fn().mockResolvedValue(undefined)
  const append = over.append ?? vi.fn().mockResolvedValue(undefined)
  return {
    markCompleted, markFailed, upload, append, fetch,
    deps: {
      jobs: { markCompleted, markFailed } as unknown as ExportJobRepository,
      storage: { upload, createSignedUrl: vi.fn() } as unknown as ExportStorage,
      workerRegistry, renderers,
      audit: { append } as unknown as AuditRepository,
      maxAttempts: 3, retentionMs: 1000, now: () => "2026-06-10T00:00:00.000Z",
    },
  }
}

describe("runExportWorker", () => {
  it("processes claimable jobs until empty (one claim each)", async () => {
    const d = deps()
    const claim = vi.fn().mockResolvedValueOnce(job({ id: "a" })).mockResolvedValueOnce(job({ id: "b" })).mockResolvedValueOnce(null)
    const jobs = { ...d.deps.jobs, claim } as unknown as ExportJobRepository
    const res = await runExportWorker({ ...d.deps, jobs }, { batchSize: 10, leaseSeconds: 60, maxAttempts: 3 })
    expect(res.processed).toBe(2)
    expect(claim).toHaveBeenCalledTimes(3)
  })

  it("completes with the attempt fence and audits on success", async () => {
    const d = deps()
    await processExportJob(d.deps, job({ attemptCount: 1 }))
    expect(d.upload).toHaveBeenCalled()
    expect(d.markCompleted).toHaveBeenCalledWith("job-1", 1, expect.objectContaining({ rowCount: 1 }))
    expect(d.append).toHaveBeenCalledWith(expect.objectContaining({ action: "export.completed" }))
  })

  it("fails with the attempt fence and audits on generation error", async () => {
    const d = deps({ fetch: vi.fn(async () => { throw new Error("boom") }) })
    await processExportJob(d.deps, job({ attemptCount: 2 }))
    expect(d.markFailed).toHaveBeenCalledWith("job-1", 2, "boom", 3)
    expect(d.markCompleted).not.toHaveBeenCalled()
    expect(d.append).toHaveBeenCalledWith(expect.objectContaining({ action: "export.failed" }))
  })
})

describe("F1 — lease fencing (stale worker)", () => {
  it("a stale worker (markCompleted=false) does NOT emit export.completed", async () => {
    const d = deps({ markCompleted: vi.fn().mockResolvedValue(false) })
    await processExportJob(d.deps, job({ attemptCount: 1 }))
    expect(d.markCompleted).toHaveBeenCalledWith("job-1", 1, expect.anything())
    // fenced out → no completed audit, no failure flip
    expect(d.append).not.toHaveBeenCalled()
    expect(d.markFailed).not.toHaveBeenCalled()
  })

  it("a stale worker on failure path (markFailed=false) does NOT emit export.failed", async () => {
    const d = deps({
      fetch: vi.fn(async () => { throw new Error("boom") }),
      markFailed: vi.fn().mockResolvedValue(false),
    })
    await processExportJob(d.deps, job({ attemptCount: 1 }))
    expect(d.append).not.toHaveBeenCalled()
  })
})

describe("F2 — audit isolation", () => {
  it("a completed job stays completed even if audit.append throws (no failure flip)", async () => {
    const append = vi.fn().mockRejectedValue(new Error("audit down"))
    const d = deps({ append })
    // Must not throw, and must NOT mark the completed job as failed.
    await expect(processExportJob(d.deps, job({ attemptCount: 1 }))).resolves.toBeUndefined()
    expect(d.markCompleted).toHaveBeenCalled()
    expect(d.markFailed).not.toHaveBeenCalled()
  })
})
