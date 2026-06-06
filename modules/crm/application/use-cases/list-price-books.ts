import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { PriceBook } from "@/modules/crm/domain/price-book"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export async function listPriceBooks(
  priceBooks: PriceBookRepository,
  tenantId: UUID,
  query: ListQuery,
): Promise<Paginated<PriceBook>> {
  return priceBooks.list(tenantId, query)
}
