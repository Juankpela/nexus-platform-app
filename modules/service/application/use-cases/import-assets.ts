import type { ImportResult } from "@/lib/csv/import-result"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { AssetImportRow } from "@/modules/service/domain/asset-import"
import type { UUID } from "@/types/shared"

export type ImportAssetsDeps = {
  assets: AssetRepository
  audit: AuditRepository
}

export type ImportAssetsInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  rows: AssetImportRow[]
}

export async function importAssets(
  { assets, audit }: ImportAssetsDeps,
  input: ImportAssetsInput,
): Promise<ImportResult> {
  const result = await assets.importBatch(input.tenantId, {
    createdBy: input.actorId,
    rows: input.rows,
  })

  if (result.imported > 0) {
    await audit.append({
      eventType: "asset.imported",
      actorType: "user",
      actorId: input.actorId,
      tenantId: input.tenantId,
      subjectType: "asset",
      subjectId: input.actorId,
      action: "asset.imported",
      metadata: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        total: input.rows.length,
      },
      requestId: input.requestId,
      source: "web",
    })
  }

  return result
}
