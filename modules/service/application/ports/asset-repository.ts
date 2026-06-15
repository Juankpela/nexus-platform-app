import type { ImportResult } from "@/lib/csv/import-result"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type {
  Asset,
  AssetFilters,
  AssetInput,
  AssetOption,
  AssetStatus,
} from "@/modules/service/domain/asset"
import type { AssetImportRow } from "@/modules/service/domain/asset-import"
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
  /** Bulk CSV import: resolves company link, defaults enums, dedups by serial. */
  importBatch(
    tenantId: UUID,
    params: { createdBy: UUID; rows: AssetImportRow[] },
  ): Promise<ImportResult>
}
