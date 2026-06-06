import type {
  PriceBook,
  PriceBookEntry,
  PriceBookEntryInput,
  PriceBookInput,
  ProductPriceAssignment,
} from "@/modules/crm/domain/price-book"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface PriceBookRepository {
  list(tenantId: UUID, query: ListQuery): Promise<Paginated<PriceBook>>
  getById(tenantId: UUID, id: UUID): Promise<PriceBook | null>
  create(tenantId: UUID, input: PriceBookInput): Promise<PriceBook>
  update(tenantId: UUID, id: UUID, input: PriceBookInput): Promise<PriceBook>
  setActive(tenantId: UUID, id: UUID, active: boolean): Promise<void>

  /** All active entries for a price book (with product details). */
  listEntries(
    tenantId: UUID,
    priceBookId: UUID,
  ): Promise<PriceBookEntry[]>

  /** All active price assignments for a product (with price book name). */
  listEntriesForProduct(
    tenantId: UUID,
    productId: UUID,
  ): Promise<ProductPriceAssignment[]>

  /**
   * Upsert a price entry. If the (price_book_id, product_id) pair already
   * exists, updates unit_price and active. Returns whether the entry is new.
   */
  upsertEntry(
    tenantId: UUID,
    priceBookId: UUID,
    input: PriceBookEntryInput,
  ): Promise<{ isNew: boolean }>

  /** Soft-deactivate an entry (active = false). No deletion. */
  deactivateEntry(
    tenantId: UUID,
    priceBookId: UUID,
    productId: UUID,
  ): Promise<void>
}
