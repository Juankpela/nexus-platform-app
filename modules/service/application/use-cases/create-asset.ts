import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { Asset, AssetInput } from "@/modules/service/domain/asset"
import type { UUID } from "@/types/shared"

export type CreateAssetDeps = {
  assets: AssetRepository
  audit: AuditRepository
}

export type CreateAssetInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: AssetInput
}

export async function createAsset(
  { assets, audit }: CreateAssetDeps,
  input: CreateAssetInput,
): Promise<Asset> {
  const assetNumber = await assets.nextAssetNumber(input.tenantId)

  const record = await assets.create(input.tenantId, {
    createdBy: input.actorId,
    assetNumber,
    input: input.data,
  })

  await audit.append({
    eventType: "service.asset.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "asset",
    subjectId: record.id,
    action: "asset.created",
    metadata: {
      assetNumber: record.assetNumber,
      name: record.name,
      category: record.assetCategory,
      criticality: record.criticality,
      companyId: record.companyId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return record
}
