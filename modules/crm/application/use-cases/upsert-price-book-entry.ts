import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { PriceBookEntryInput } from "@/modules/crm/domain/price-book"
import type { UUID } from "@/types/shared"

export type UpsertPriceBookEntryDeps = {
  priceBooks: PriceBookRepository
  audit: AuditRepository
}

export type UpsertPriceBookEntryInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  priceBookId: UUID
  data: PriceBookEntryInput
}

export async function upsertPriceBookEntry(
  { priceBooks, audit }: UpsertPriceBookEntryDeps,
  input: UpsertPriceBookEntryInput,
): Promise<void> {
  const book = await priceBooks.getById(input.tenantId, input.priceBookId)
  if (!book) {
    throw new ApplicationError("Price book not found.", "PRICE_BOOK_NOT_FOUND")
  }

  const { isNew } = await priceBooks.upsertEntry(
    input.tenantId,
    input.priceBookId,
    input.data,
  )

  const eventType = isNew ? "pricebook_entry.created" : "pricebook_entry.updated"
  await audit.append({
    eventType,
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "price_book",
    subjectId: input.priceBookId,
    action: eventType,
    metadata: {
      priceBookName: book.name,
      productId: input.data.productId,
      unitPrice: input.data.unitPrice,
    },
    requestId: input.requestId,
    source: "web",
  })
}
