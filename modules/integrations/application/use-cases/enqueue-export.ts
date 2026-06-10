import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type {
  EnqueueParams,
  ExportJobRepository,
} from "@/modules/integrations/application/ports/export-job-repository"
import type { ExportJob } from "@/modules/integrations/domain/export-job"
import type { UUID } from "@/types/shared"

export type EnqueueExportDeps = {
  jobs: ExportJobRepository
  audit: AuditRepository
}

export type EnqueueExportInput = EnqueueParams & {
  actorId: UUID
  requestId: UUID
}

/** Create a queued async export job and audit it. Authorization is enforced upstream. */
export async function enqueueExport(
  { jobs, audit }: EnqueueExportDeps,
  input: EnqueueExportInput,
): Promise<ExportJob> {
  const job = await jobs.enqueue({
    tenantId: input.tenantId,
    requestedBy: input.requestedBy,
    object: input.object,
    format: input.format,
    filters: input.filters,
  })

  await audit.append({
    eventType: "export.queued",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: input.object,
    subjectId: job.id,
    action: "export.queued",
    metadata: { object: input.object, format: input.format, filters: { ...input.filters } },
    requestId: input.requestId,
    source: "integrations",
  })

  return job
}
