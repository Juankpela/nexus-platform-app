import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { Quote, QuoteInput } from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type UpdateQuoteDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type UpdateQuoteInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: QuoteInput
}

export async function updateQuote(
  { quotes, audit }: UpdateQuoteDeps,
  input: UpdateQuoteInput,
): Promise<Quote> {
  const existing = await quotes.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  const updated = await quotes.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "quote.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: input.id,
    action: "quote.updated",
    metadata: {
      quoteNumber: existing.quoteNumber,
      version: existing.version,
    },
    requestId: input.requestId,
    source: "web",
  })

  return updated
}
