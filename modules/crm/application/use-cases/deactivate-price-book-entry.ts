import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { UUID } from "@/types/shared"

export type DeactivatePriceBookEntryDeps = {
  priceBooks: PriceBookRepository
  audit: AuditRepository
}

export type DeactivatePriceBookEntryInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  priceBookId: UUID
  productId: UUID
}

export async function deactivatePriceBookEntry(
  { priceBooks, audit }: DeactivatePriceBookEntryDeps,
  input: DeactivatePriceBookEntryInput,
): Promise<void> {
  const book = await priceBooks.getById(input.tenantId, input.priceBookId)
  if (!book) {
    throw new ApplicationError("Price book not found.", "PRICE_BOOK_NOT_FOUND")
  }

  await priceBooks.deactivateEntry(
    input.tenantId,
    input.priceBookId,
    input.productId,
  )

  await audit.append({
    eventType: "pricebook_entry.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "price_book",
    subjectId: input.priceBookId,
    action: "pricebook_entry.updated",
    metadata: {
      priceBookName: book.name,
      productId: input.productId,
      active: false,
    },
    requestId: input.requestId,
    source: "web",
  })
}
