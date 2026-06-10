import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ExportRenderer } from "@/modules/integrations/application/ports/export-renderer"
import type { ExportRegistry } from "@/modules/integrations/application/ports/export-source"
import {
  CONTENT_TYPE,
  EXPORT_ROW_CAP,
  type ExportArtifact,
  type ExportFilters,
  type ExportFormat,
  type ExportableObject,
} from "@/modules/integrations/domain/export-contract"
import type { UUID } from "@/types/shared"

export type BuildExportDeps = {
  registry: ExportRegistry
  renderers: Record<ExportFormat, ExportRenderer>
  audit: AuditRepository
}

export type BuildExportInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  object: ExportableObject
  format: ExportFormat
  filters: ExportFilters
  /** ISO timestamp from the caller (keeps the use-case deterministic/testable). */
  timestamp: string
}

/**
 * Build one export artifact (ADR-024): resolve the object's definition → fetch rows
 * (RLS-scoped, capped) → reject if over the sync cap → render via the format's
 * renderer using the centralized columns → emit an audit event. No business logic;
 * reads only. Authorization is enforced by the presentation layer via the
 * definition's `permission`.
 */
export async function buildExport(
  { registry, renderers, audit }: BuildExportDeps,
  input: BuildExportInput,
): Promise<ExportArtifact> {
  const def = registry.get(input.object)
  const renderer = renderers[input.format]

  const { rows, total } = await def.fetch(input.tenantId, input.filters, EXPORT_ROW_CAP)
  if (total > EXPORT_ROW_CAP) {
    throw new ApplicationError(
      `Export exceeds the synchronous limit of ${EXPORT_ROW_CAP} rows; refine filters (async export arrives in Sprint C).`,
      "EXPORT_TOO_LARGE",
    )
  }

  const body = await renderer.render(def.columns, rows)
  const datePart = input.timestamp.slice(0, 10).replace(/-/g, "")
  const filename = `${input.object}_${input.tenantId.slice(0, 8)}_${datePart}.${input.format}`

  await audit.append({
    eventType: "export.generated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: input.object,
    action: "export.generated",
    metadata: {
      object: input.object,
      format: input.format,
      filters: { ...input.filters },
      rowCount: rows.length,
    },
    requestId: input.requestId,
    source: "integrations",
  })

  return {
    filename,
    contentType: CONTENT_TYPE[input.format],
    body,
    rowCount: rows.length,
  }
}
