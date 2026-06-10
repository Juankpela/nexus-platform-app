import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExportJobRepository } from "@/modules/integrations/application/ports/export-job-repository"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ExportRegistry } from "@/modules/integrations/application/ports/export-source"
import type { ExportStorage } from "@/modules/integrations/application/ports/export-storage"
import {
  CONTENT_TYPE,
  EXPORT_ASYNC_CAP,
  type ExportFormat,
} from "@/modules/integrations/domain/export-contract"
import type { ExportJob } from "@/modules/integrations/domain/export-job"

export type ProcessExportDeps = {
  workerRegistry: ExportRegistry
  renderers: Record<ExportFormat, ExportRenderer>
  jobs: ExportJobRepository
  storage: ExportStorage
  audit: AuditRepository
  maxAttempts: number
  retentionMs: number
  now: () => string
}

/**
 * Generate one claimed job's file and finalize it (ADR-024 worker path). On failure
 * the job is requeued (attempts remaining) or marked failed; both outcomes audit.
 * The worker registry's fetch is service-role + tenant-scoped (worker exception).
 */
export async function processExportJob(
  deps: ProcessExportDeps,
  job: ExportJob,
): Promise<void> {
  try {
    const def = deps.workerRegistry.get(job.object)
    const { rows } = await def.fetch(job.tenantId, job.filters, EXPORT_ASYNC_CAP)
    const body = await deps.renderers[job.format].render(def.columns, rows)

    const path = `${job.tenantId}/${job.id}.${job.format}`
    await deps.storage.upload(path, body, CONTENT_TYPE[job.format])

    const expiresAt = new Date(Date.parse(deps.now()) + deps.retentionMs).toISOString()
    // F1: fenced by the attempt this worker holds — a stale worker (lease expired,
    // job reclaimed by a newer worker) gets `committed=false` and must NOT overwrite.
    const committed = await deps.jobs.markCompleted(job.id, job.attemptCount, {
      storagePath: path,
      rowCount: rows.length,
      expiresAt,
    })
    // F2: audit is isolated — its failure can NEVER change business state. We only
    // emit (and only swallow-on-error) AFTER the job was actually committed.
    if (committed) {
      await safeAudit(deps, {
        eventType: "export.completed",
        actorType: "service",
        actorId: job.requestedBy,
        tenantId: job.tenantId,
        subjectType: job.object,
        subjectId: job.id,
        action: "export.completed",
        metadata: { object: job.object, format: job.format, rowCount: rows.length },
        source: "integrations",
      })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export generation failed."
    // Generation failed → fenced fail/requeue. Stale worker → committed=false, no-op.
    const committed = await deps.jobs.markFailed(
      job.id,
      job.attemptCount,
      message,
      deps.maxAttempts,
    )
    if (committed) {
      await safeAudit(deps, {
        eventType: "export.failed",
        actorType: "service",
        actorId: job.requestedBy,
        tenantId: job.tenantId,
        subjectType: job.object,
        subjectId: job.id,
        action: "export.failed",
        metadata: { object: job.object, attempt: job.attemptCount, error: message },
        source: "integrations",
      })
    }
  }
}

/** Audit emission whose failure is swallowed — it must never alter business state (F2). */
async function safeAudit(
  deps: ProcessExportDeps,
  event: Parameters<ProcessExportDeps["audit"]["append"]>[0],
): Promise<void> {
  try {
    await deps.audit.append(event)
  } catch {
    // Intentionally swallowed: a completed/failed job stays so even if audit logging fails.
  }
}
