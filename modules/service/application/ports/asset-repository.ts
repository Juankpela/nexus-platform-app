import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  Asset,
  AssetFilters,
  AssetInput,
  AssetOption,
  AssetStatus,
} from "@/modules/service/domain/asset"
import type { UUID } from "@/types/shared"

export interface AssetRepository {
  list(
    tenantId: UUID,
    filters: AssetFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Asset>>
  getById(tenantId: UUID, id: UUID): Promise<Asset | null>
  listOptions(tenantId: UUID): Promise<AssetOption[]>
  create(
    tenantId: UUID,
    params: { createdBy: UUID; assetNumber: string; input: AssetInput },
  ): Promise<Asset>
  update(tenantId: UUID, id: UUID, input: AssetInput): Promise<Asset>
  setStatus(tenantId: UUID, id: UUID, status: AssetStatus): Promise<void>
  nextAssetNumber(tenantId: UUID): Promise<string>
}
