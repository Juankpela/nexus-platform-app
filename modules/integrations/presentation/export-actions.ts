"use server"

import { randomUUID } from "node:crypto"

import { hasPermission } from "@/modules/authorization/domain/permission"
import {
  buildExportArtifact,
  exportPermissionFor,
} from "@/modules/integrations/composition"
import {
  isExportFormat,
  isExportableObject,
  type ExportFilters,
} from "@/modules/integrations/domain/export-contract"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type ExportResult =
  | { ok: true; filename: string; contentType: string; base64: string; rowCount: number }
  | { ok: false; error: string }

/**
 * In-app export Server Action (INT-1, session auth). Gates on the object's existing
 * read permission, builds the artifact, and returns it base64-encoded for the client
 * to download. No public API, no API keys (those are INT-2).
 */
export async function exportDataAction(
  tenantSlug: string,
  object: string,
  format: string,
  filters: ExportFilters,
): Promise<ExportResult> {
  try {
    if (!isExportableObject(object)) return { ok: false, error: "Unsupported object." }
    if (!isExportFormat(format)) return { ok: false, error: "Unsupported format." }

    const context = await getRequestContext(tenantSlug)
    const permission = exportPermissionFor(object)
    if (!permission || !hasPermission(context.effectivePermissions, permission)) {
      return { ok: false, error: "You do not have permission to export this data." }
    }

    const artifact = await buildExportArtifact({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: randomUUID(),
      object,
      format,
      filters,
      timestamp: new Date().toISOString(),
    })

    return {
      ok: true,
      filename: artifact.filename,
      contentType: artifact.contentType,
      base64: Buffer.from(artifact.body).toString("base64"),
      rowCount: artifact.rowCount,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed."
    return { ok: false, error: message }
  }
}
