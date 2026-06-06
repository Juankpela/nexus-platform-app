import type {
  Product,
  ProductImportResult,
  ProductImportRow,
  ProductInput,
  ProductListQuery,
  ProductOption,
} from "@/modules/crm/domain/product"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface ProductRepository {
  list(tenantId: UUID, query: ProductListQuery): Promise<Paginated<Product>>
  getById(tenantId: UUID, id: UUID): Promise<Product | null>
  create(tenantId: UUID, input: ProductInput): Promise<Product>
  update(tenantId: UUID, id: UUID, input: ProductInput): Promise<Product>
  setActive(tenantId: UUID, id: UUID, active: boolean): Promise<void>
  listActiveOptions(tenantId: UUID): Promise<ProductOption[]>
  importBatch(
    tenantId: UUID,
    rows: ProductImportRow[],
  ): Promise<ProductImportResult>
  exportAll(tenantId: UUID): Promise<Product[]>
}
