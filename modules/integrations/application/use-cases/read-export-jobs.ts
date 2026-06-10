import { ApplicationError } from "@/lib/errors/application-error"
import type { ExportJobRepository } from "@/modules/integrations/application/ports/export-job-repository"
import type { ExportStorage } from "@/modules/integrations/application/ports/export-storage"
import { isDownloadable, type ExportJob } from "@/modules/integrations/domain/export-job"
import type { UUID } from "@/types/shared"

export function listExportJobs(
  { jobs }: { jobs: ExportJobRepository },
  tenantId: UUID,
  requestedBy: UUID,
  page: { limit: number; offset: number },
): Promise<{ items: ExportJob[]; total: number }> {
  return jobs.listForRequester(tenantId, requestedBy, page)
}

export type DownloadDeps = { jobs: ExportJobRepository; storage: ExportStorage }

/**
 * Mint a short-TTL signed URL for the requester's OWN completed job. Ownership is
 * enforced by `getOwned` (RLS: requested_by = auth.uid()); expired/incomplete jobs
 * are rejected. Never returns a public URL.
 */
export async function getExportDownloadUrl(
  { jobs, storage }: DownloadDeps,
  tenantId: UUID,
  requestedBy: UUID,
  jobId: UUID,
  now: string,
  ttlSeconds: number,
): Promise<string> {
  const job = await jobs.getOwned(tenantId, requestedBy, jobId)
  if (!job) throw new ApplicationError("Export not found.", "EXPORT_NOT_FOUND")
  if (!isDownloadable(job, now) || !job.storagePath) {
    throw new ApplicationError("Export is not available for download.", "EXPORT_NOT_READY")
  }
  return storage.createSignedUrl(job.storagePath, ttlSeconds)
}
