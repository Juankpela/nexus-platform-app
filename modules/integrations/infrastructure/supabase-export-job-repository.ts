import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  EnqueueParams,
  ExportJobRepository,
} from "@/modules/integrations/application/ports/export-job-repository"
import type {
  ExportFilters,
  ExportFormat,
  ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { ExportJob } from "@/modules/integrations/domain/export-job"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type JobRow = Database["public"]["Tables"]["export_jobs"]["Row"]

function toJob(row: JobRow): ExportJob {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    requestedBy: row.requested_by,
    object: row.object as ExportableObject,
    format: row.format as ExportFormat,
    filters: (row.filters ?? {}) as ExportFilters,
    status: row.status,
    rowCount: row.row_count,
    storagePath: row.storage_path,
    lastError: row.last_error,
    attemptCount: row.attempt_count,
    leaseUntil: row.lease_until,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  }
}

export class SupabaseExportJobRepository implements ExportJobRepository {
  async enqueue(params: EnqueueParams): Promise<ExportJob> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("export_jobs")
      .insert({
        tenant_id: params.tenantId,
        requested_by: params.requestedBy,
        object: params.object,
        format: params.format,
        filters: params.filters as Database["public"]["Tables"]["export_jobs"]["Insert"]["filters"],
      })
      .select("*")
      .single()
    if (error || !data) {
      throw new ApplicationError("Unable to enqueue export.", "EXPORT_ENQUEUE_FAILED", error)
    }
    return toJob(data)
  }

  async listForRequester(
    tenantId: UUID,
    requestedBy: UUID,
    page: { limit: number; offset: number },
  ): Promise<{ items: ExportJob[]; total: number }> {
    const client = await createServerSupabaseClient()
    const { data, error, count } = await client
      .from("export_jobs")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("requested_by", requestedBy)
      .order("created_at", { ascending: false })
      .range(page.offset, page.offset + page.limit - 1)
    if (error) {
      throw new ApplicationError("Unable to list exports.", "EXPORTS_LIST_FAILED", error)
    }
    return { items: (data ?? []).map(toJob), total: count ?? 0 }
  }

  async getOwned(tenantId: UUID, requestedBy: UUID, id: UUID): Promise<ExportJob | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("export_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("requested_by", requestedBy)
      .eq("id", id)
      .maybeSingle()
    if (error) {
      throw new ApplicationError("Unable to load export.", "EXPORT_LOAD_FAILED", error)
    }
    return data ? toJob(data) : null
  }

  // ── Worker path (service role) ──
  async claim(leaseSeconds: number, maxAttempts: number): Promise<ExportJob | null> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.rpc("claim_export_job", {
      p_lease_seconds: leaseSeconds,
      p_max_attempts: maxAttempts,
    })
    if (error) {
      throw new ApplicationError("Unable to claim export job.", "EXPORT_CLAIM_FAILED", error)
    }
    return data ? toJob(data as unknown as JobRow) : null
  }

  async markCompleted(
    id: UUID,
    expectedAttempt: number,
    result: { storagePath: string; rowCount: number; expiresAt: string },
  ): Promise<boolean> {
    const admin = createAdminSupabaseClient()
    // F1 fence: only the worker holding the active lease (matching attempt + still
    // processing) may complete. A reclaimed job (newer attempt) won't match.
    const { data, error } = await admin
      .from("export_jobs")
      .update({
        status: "completed",
        storage_path: result.storagePath,
        row_count: result.rowCount,
        expires_at: result.expiresAt,
        completed_at: new Date().toISOString(),
        lease_until: null,
      })
      .eq("id", id)
      .eq("attempt_count", expectedAttempt)
      .eq("status", "processing")
      .select("id")
    if (error) {
      throw new ApplicationError("Unable to complete export job.", "EXPORT_COMPLETE_FAILED", error)
    }
    return (data ?? []).length > 0
  }

  async markFailed(
    id: UUID,
    expectedAttempt: number,
    errorMessage: string,
    maxAttempts: number,
  ): Promise<boolean> {
    const admin = createAdminSupabaseClient()
    // exhausted decided from the attempt this worker holds (no read-then-write race).
    const exhausted = expectedAttempt >= maxAttempts
    const { data, error } = await admin
      .from("export_jobs")
      .update({
        status: exhausted ? "failed" : "queued",
        last_error: errorMessage,
        lease_until: null,
      })
      .eq("id", id)
      .eq("attempt_count", expectedAttempt)
      .eq("status", "processing")
      .select("id")
    if (error) {
      throw new ApplicationError("Unable to fail export job.", "EXPORT_FAIL_FAILED", error)
    }
    return (data ?? []).length > 0
  }
}
