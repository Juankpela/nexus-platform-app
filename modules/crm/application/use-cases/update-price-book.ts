import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { PriceBook, PriceBookInput } from "@/modules/crm/domain/price-book"
import type { UUID } from "@/types/shared"

export type UpdatePriceBookDeps = {
  priceBooks: PriceBookRepository
  audit: AuditRepository
}

export type UpdatePriceBookInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: PriceBookInput
}

export async function updatePriceBook(
  { priceBooks, audit }: UpdatePriceBookDeps,
  input: UpdatePriceBookInput,
): Promise<PriceBook> {
  const existing = await priceBooks.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Price book not found.", "PRICE_BOOK_NOT_FOUND")
  }

  const priceBook = await priceBooks.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "pricebook.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "price_book",
    subjectId: priceBook.id,
    action: "pricebook.updated",
    metadata: { name: priceBook.name },
    requestId: input.requestId,
    source: "web",
  })

  return priceBook
}
