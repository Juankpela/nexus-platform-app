import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { Quote, QuoteInput } from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type CreateQuoteDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type CreateQuoteInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: QuoteInput
}

export async function createQuote(
  { quotes, audit }: CreateQuoteDeps,
  input: CreateQuoteInput,
): Promise<Quote> {
  const quote = await quotes.create(input.tenantId, input.data)

  await audit.append({
    eventType: "quote.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: quote.id,
    action: "quote.created",
    metadata: {
      quoteNumber: quote.quoteNumber,
      version: quote.version,
    },
    requestId: input.requestId,
    source: "web",
  })

  return quote
}
