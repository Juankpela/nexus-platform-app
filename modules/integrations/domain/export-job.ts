import type {
  ExportFilters,
  ExportFormat,
  ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { UUID } from "@/types/shared"

/** Lifecycle of an async export (ADR-024). Pure domain — no infrastructure. */
export type ExportJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired"

export const EXPORT_JOB_STATUS_LABELS: Record<ExportJobStatus, string> = {
  queued: "En cola",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
  expired: "Expirado",
}

export type ExportJob = {
  id: UUID
  tenantId: UUID
  requestedBy: UUID
  object: ExportableObject
  format: ExportFormat
  filters: ExportFilters
  status: ExportJobStatus
  rowCount: number | null
  storagePath: string | null
  lastError: string | null
  attemptCount: number
  leaseUntil: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  expiresAt: string | null
}

export function isTerminal(status: ExportJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "expired"
}

/** A completed job is downloadable only while it has a file and has not expired. */
export function isDownloadable(job: ExportJob, now: string): boolean {
  return (
    job.status === "completed" &&
    job.storagePath !== null &&
    (job.expiresAt === null || job.expiresAt > now)
  )
}
