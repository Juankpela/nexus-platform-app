import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { AssetStatus } from "@/modules/service/domain/asset"
import type { UUID } from "@/types/shared"

export type ChangeAssetStatusDeps = {
  assets: AssetRepository
  audit: AuditRepository
}

export type ChangeAssetStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: AssetStatus
}

export async function changeAssetStatus(
  { assets, audit }: ChangeAssetStatusDeps,
  input: ChangeAssetStatusInput,
): Promise<void> {
  const existing = await assets.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Asset not found.", "ASSET_NOT_FOUND")
  }
  if (existing.status === input.status) return

  await assets.setStatus(input.tenantId, input.id, input.status)

  await audit.append({
    eventType:
      input.status === "retired"
        ? "service.asset.retired"
        : "service.asset.status_changed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "asset",
    subjectId: input.id,
    action: input.status === "retired" ? "asset.retired" : "asset.status_changed",
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  })
}
