import type {
  ExportFilters,
  ExportFormat,
  ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { ExportJob } from "@/modules/integrations/domain/export-job"
import type { UUID } from "@/types/shared"

export type EnqueueParams = {
  tenantId: UUID
  requestedBy: UUID
  object: ExportableObject
  format: ExportFormat
  filters: ExportFilters
}

export interface ExportJobRepository {
  // ── Session / RLS path (requester) ──
  enqueue(params: EnqueueParams): Promise<ExportJob>
  listForRequester(
    tenantId: UUID,
    requestedBy: UUID,
    page: { limit: number; offset: number },
  ): Promise<{ items: ExportJob[]; total: number }>
  getOwned(tenantId: UUID, requestedBy: UUID, id: UUID): Promise<ExportJob | null>

  // ── Worker path (service role; ADR-024 worker exception) ──
  /** Atomically claim one claimable job (SKIP LOCKED + lease). Null if none. */
  claim(leaseSeconds: number, maxAttempts: number): Promise<ExportJob | null>
  /**
   * Finalize as completed ONLY if the worker still owns the active lease — fenced by
   * `expectedAttempt` + `status='processing'` (F1). Returns false if a newer worker
   * has since reclaimed the job (stale worker → must not overwrite).
   */
  markCompleted(
    id: UUID,
    expectedAttempt: number,
    result: { storagePath: string; rowCount: number; expiresAt: string },
  ): Promise<boolean>
  /**
   * Requeue (attempts remain) or fail, fenced by `expectedAttempt` + processing
   * status (F1). Returns false if the job was reclaimed by a newer worker.
   */
  markFailed(
    id: UUID,
    expectedAttempt: number,
    error: string,
    maxAttempts: number,
  ): Promise<boolean>
}
