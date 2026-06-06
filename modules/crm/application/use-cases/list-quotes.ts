import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { QuoteListItem, QuoteListQuery } from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export async function listQuotes(
  quotes: QuoteRepository,
  tenantId: UUID,
  query: QuoteListQuery,
): Promise<Paginated<QuoteListItem>> {
  return quotes.list(tenantId, query)
}
