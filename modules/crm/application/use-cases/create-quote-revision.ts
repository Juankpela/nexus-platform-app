import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { Quote } from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type CreateQuoteRevisionDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type CreateQuoteRevisionInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  sourceId: UUID
}

export async function createQuoteRevision(
  { quotes, audit }: CreateQuoteRevisionDeps,
  input: CreateQuoteRevisionInput,
): Promise<Quote> {
  const source = await quotes.getById(input.tenantId, input.sourceId)
  if (!source) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  const revision = await quotes.createRevision(input.tenantId, input.sourceId)

  await audit.append({
    eventType: "quote.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: revision.id,
    action: "quote.revised",
    metadata: {
      quoteNumber: revision.quoteNumber,
      version: revision.version,
      sourceId: input.sourceId,
      sourceVersion: source.version,
    },
    requestId: input.requestId,
    source: "web",
  })

  return revision
}
