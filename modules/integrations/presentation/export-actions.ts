"use server"

import { randomUUID } from "node:crypto"

import { hasPermission } from "@/modules/authorization/domain/permission"
import {
  buildExportArtifact,
  enqueueExportJob,
  exportPermissionFor,
  getExportDownload,
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

export type EnqueueResult = { ok: true; jobId: string } | { ok: false; error: string }

/** Queue an async export (Tier 1 validation path / large datasets). */
export async function enqueueExportAction(
  tenantSlug: string,
  object: string,
  format: string,
  filters: ExportFilters,
): Promise<EnqueueResult> {
  try {
    if (!isExportableObject(object)) return { ok: false, error: "Unsupported object." }
    if (!isExportFormat(format)) return { ok: false, error: "Unsupported format." }

    const context = await getRequestContext(tenantSlug)
    const permission = exportPermissionFor(object)
    if (!permission || !hasPermission(context.effectivePermissions, permission)) {
      return { ok: false, error: "You do not have permission to export this data." }
    }

    const job = await enqueueExportJob({
      actorId: context.userId,
      requestId: randomUUID(),
      tenantId: context.tenantId,
      requestedBy: context.userId,
      object,
      format,
      filters,
    })
    return { ok: true, jobId: job.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not queue export." }
  }
}

export type DownloadResult = { ok: true; url: string } | { ok: false; error: string }

/** Mint a short-TTL signed URL for the requester's own completed export job. */
export async function getExportDownloadAction(
  tenantSlug: string,
  jobId: string,
): Promise<DownloadResult> {
  try {
    const context = await getRequestContext(tenantSlug)
    const url = await getExportDownload(context.tenantId, context.userId, jobId)
    return { ok: true, url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download unavailable." }
  }
}
