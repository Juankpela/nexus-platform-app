import type { ExportJobRepository } from "@/modules/integrations/application/ports/export-job-repository"
import {
  processExportJob,
  type ProcessExportDeps,
} from "@/modules/integrations/application/use-cases/process-export-job"

export type RunWorkerConfig = {
  batchSize: number
  leaseSeconds: number
  maxAttempts: number
}

/**
 * Drain claimable jobs up to `batchSize`. Each claim is atomic (SKIP LOCKED + lease),
 * so multiple concurrent worker invocations never double-process a job. Returns how
 * many jobs were processed this run.
 */
export async function runExportWorker(
  deps: ProcessExportDeps & { jobs: ExportJobRepository },
  config: RunWorkerConfig,
): Promise<{ processed: number }> {
  let processed = 0
  for (let i = 0; i < config.batchSize; i++) {
    const job = await deps.jobs.claim(config.leaseSeconds, config.maxAttempts)
    if (!job) break
    await processExportJob(deps, job)
    processed++
  }
  return { processed }
}
