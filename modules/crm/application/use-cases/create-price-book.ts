import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { PriceBook, PriceBookInput } from "@/modules/crm/domain/price-book"
import type { UUID } from "@/types/shared"

export type CreatePriceBookDeps = {
  priceBooks: PriceBookRepository
  audit: AuditRepository
}

export type CreatePriceBookInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: PriceBookInput
}

export async function createPriceBook(
  { priceBooks, audit }: CreatePriceBookDeps,
  input: CreatePriceBookInput,
): Promise<PriceBook> {
  const priceBook = await priceBooks.create(input.tenantId, input.data)

  await audit.append({
    eventType: "pricebook.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "price_book",
    subjectId: priceBook.id,
    action: "pricebook.created",
    metadata: { name: priceBook.name },
    requestId: input.requestId,
    source: "web",
  })

  return priceBook
}
