import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type { AssetFilters } from "@/modules/service/domain/asset"
import type { UUID } from "@/types/shared"

export function listAssets(
  assets: AssetRepository,
  tenantId: UUID,
  filters: AssetFilters,
  page: number,
  pageSize: number,
) {
  return assets.list(tenantId, filters, page, pageSize)
}
