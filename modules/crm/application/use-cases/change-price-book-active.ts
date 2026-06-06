import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type { UUID } from "@/types/shared"

export type ChangePriceBookActiveDeps = {
  priceBooks: PriceBookRepository
  audit: AuditRepository
}

export type ChangePriceBookActiveInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  active: boolean
}

export async function changePriceBookActive(
  { priceBooks, audit }: ChangePriceBookActiveDeps,
  input: ChangePriceBookActiveInput,
): Promise<void> {
  const existing = await priceBooks.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Price book not found.", "PRICE_BOOK_NOT_FOUND")
  }
  if (existing.active === input.active) return

  await priceBooks.setActive(input.tenantId, input.id, input.active)

  const eventType = input.active ? "pricebook.updated" : "pricebook.deactivated"
  await audit.append({
    eventType,
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "price_book",
    subjectId: input.id,
    action: eventType,
    metadata: { name: existing.name, active: input.active },
    requestId: input.requestId,
    source: "web",
  })
}
