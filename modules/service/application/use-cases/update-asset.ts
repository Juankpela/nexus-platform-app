import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { Asset, AssetInput } from "@/modules/service/domain/asset"
import type { UUID } from "@/types/shared"

export type UpdateAssetDeps = {
  assets: AssetRepository
  audit: AuditRepository
}

export type UpdateAssetInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: AssetInput
}

export async function updateAsset(
  { assets, audit }: UpdateAssetDeps,
  input: UpdateAssetInput,
): Promise<Asset> {
  const existing = await assets.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Asset not found.", "ASSET_NOT_FOUND")
  }

  const record = await assets.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "service.asset.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "asset",
    subjectId: record.id,
    action: "asset.updated",
    metadata: { assetNumber: record.assetNumber, name: record.name },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
