import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import {
  CRM_PERMISSIONS,
  INVENTORY_PERMISSIONS,
} from "@/modules/authorization/domain/permission"
import { COLUMN_REGISTRY } from "@/modules/integrations/application/column-registry"
import type {
  ExportDefinition,
  ExportRegistry,
} from "@/modules/integrations/application/ports/export-source"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import {
  buildExport,
  type BuildExportInput,
} from "@/modules/integrations/application/use-cases/build-export"
import {
  enqueueExport,
  type EnqueueExportInput,
} from "@/modules/integrations/application/use-cases/enqueue-export"
import {
  getExportDownloadUrl,
  listExportJobs,
} from "@/modules/integrations/application/use-cases/read-export-jobs"
import { runExportWorker } from "@/modules/integrations/application/use-cases/run-export-worker"
import {
  accountsFetch,
  contactsFetch,
  materialsFetch,
} from "@/modules/integrations/infrastructure/export-data-sources"
import {
  accountsWorkerFetch,
  contactsWorkerFetch,
  materialsWorkerFetch,
} from "@/modules/integrations/infrastructure/worker-data-sources"
import { SupabaseExportJobRepository } from "@/modules/integrations/infrastructure/supabase-export-job-repository"
import { SupabaseExportStorage } from "@/modules/integrations/infrastructure/supabase-export-storage"
import { CsvRenderer } from "@/modules/integrations/infrastructure/csv-renderer"
import { XlsxRenderer } from "@/modules/integrations/infrastructure/xlsx-renderer"
import type {
  ExportArtifact,
  ExportFormat,
} from "@/modules/integrations/domain/export-contract"
import type { UUID } from "@/types/shared"

const DEFINITIONS: Record<string, ExportDefinition> = {
  materials: {
    object: "materials",
    label: "Materials",
    permission: INVENTORY_PERMISSIONS.materialsRead,
    columns: COLUMN_REGISTRY.materials,
    fetch: materialsFetch,
  },
  accounts: {
    object: "accounts",
    label: "Accounts",
    permission: CRM_PERMISSIONS.companiesRead,
    columns: COLUMN_REGISTRY.accounts,
    fetch: accountsFetch,
  },
  contacts: {
    object: "contacts",
    label: "Contacts",
    permission: CRM_PERMISSIONS.contactsRead,
    columns: COLUMN_REGISTRY.contacts,
    fetch: contactsFetch,
  },
}

const registry: ExportRegistry = {
  get: (object) => DEFINITIONS[object],
}

const renderers: Record<ExportFormat, ExportRenderer> = {
  csv: new CsvRenderer(),
  xlsx: new XlsxRenderer(),
}

/** Permission that gates a given export object (used by presentation before building). */
export function exportPermissionFor(object: string): string | null {
  return DEFINITIONS[object]?.permission ?? null
}

export function buildExportArtifact(input: BuildExportInput): Promise<ExportArtifact> {
  return buildExport(
    { registry, renderers, audit: new SupabaseAuditRepository() },
    input,
  )
}

// ── Async export (Sprint C1) ────────────────────────────────────────────────
const WORKER_DEFINITIONS: Record<string, ExportDefinition> = {
  materials: { ...DEFINITIONS.materials, fetch: materialsWorkerFetch },
  accounts: { ...DEFINITIONS.accounts, fetch: accountsWorkerFetch },
  contacts: { ...DEFINITIONS.contacts, fetch: contactsWorkerFetch },
}
const workerRegistry: ExportRegistry = { get: (object) => WORKER_DEFINITIONS[object] }

export const EXPORT_WORKER = {
  leaseSeconds: 120,
  maxAttempts: 3,
  batchSize: 10,
  retentionMs: 72 * 60 * 60 * 1000,
  signedUrlTtl: 300,
}

function jobRepo() {
  return new SupabaseExportJobRepository()
}
function storage() {
  return new SupabaseExportStorage()
}

export function enqueueExportJob(input: EnqueueExportInput) {
  return enqueueExport({ jobs: jobRepo(), audit: new SupabaseAuditRepository() }, input)
}

export function runExportWorkerBatch() {
  return runExportWorker(
    {
      jobs: jobRepo(),
      storage: storage(),
      workerRegistry,
      renderers,
      audit: new SupabaseAuditRepository(),
      maxAttempts: EXPORT_WORKER.maxAttempts,
      retentionMs: EXPORT_WORKER.retentionMs,
      now: () => new Date().toISOString(),
    },
    {
      batchSize: EXPORT_WORKER.batchSize,
      leaseSeconds: EXPORT_WORKER.leaseSeconds,
      maxAttempts: EXPORT_WORKER.maxAttempts,
    },
  )
}

export function listMyExportJobs(
  tenantId: UUID,
  requestedBy: UUID,
  page: { limit: number; offset: number },
) {
  return listExportJobs({ jobs: jobRepo() }, tenantId, requestedBy, page)
}

export function getExportDownload(tenantId: UUID, requestedBy: UUID, jobId: UUID) {
  return getExportDownloadUrl(
    { jobs: jobRepo(), storage: storage() },
    tenantId,
    requestedBy,
    jobId,
    new Date().toISOString(),
    EXPORT_WORKER.signedUrlTtl,
  )
}
