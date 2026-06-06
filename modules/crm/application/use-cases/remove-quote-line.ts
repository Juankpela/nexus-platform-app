import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { UUID } from "@/types/shared"

export type RemoveQuoteLineDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type RemoveQuoteLineInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  quoteId: UUID
  lineId: UUID
}

export async function removeQuoteLine(
  { quotes, audit }: RemoveQuoteLineDeps,
  input: RemoveQuoteLineInput,
): Promise<void> {
  const quote = await quotes.getById(input.tenantId, input.quoteId)
  if (!quote) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  if (quote.status !== "draft" && quote.status !== "approved") {
    throw new ApplicationError(
      "Lines can only be removed from draft or approved quotes.",
      "QUOTE_NOT_EDITABLE",
    )
  }

  await quotes.removeLine(input.tenantId, input.lineId)
  await quotes.recalculateTotals(input.tenantId, input.quoteId)

  await audit.append({
    eventType: "quote.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: input.quoteId,
    action: "quote.line_removed",
    metadata: {
      quoteNumber: quote.quoteNumber,
      lineId: input.lineId,
    },
    requestId: input.requestId,
    source: "web",
  })
}
