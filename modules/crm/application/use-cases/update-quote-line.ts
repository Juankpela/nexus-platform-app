import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import {
  computeLineTotal,
  type QuoteLine,
  type QuoteLineInput,
} from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type UpdateQuoteLineDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type UpdateQuoteLineInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  quoteId: UUID
  lineId: UUID
  data: QuoteLineInput
}

export async function updateQuoteLine(
  { quotes, audit }: UpdateQuoteLineDeps,
  input: UpdateQuoteLineInput,
): Promise<QuoteLine> {
  const quote = await quotes.getById(input.tenantId, input.quoteId)
  if (!quote) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  if (quote.status !== "draft" && quote.status !== "approved") {
    throw new ApplicationError(
      "Lines can only be edited on draft or approved quotes.",
      "QUOTE_NOT_EDITABLE",
    )
  }

  const lineData: QuoteLineInput & { lineTotal: number } = {
    ...input.data,
    discountAmount: Math.max(0, input.data.discountAmount),
    lineTotal: computeLineTotal(
      input.data.quantity,
      input.data.unitPrice,
      input.data.discountAmount,
    ),
  }

  const line = await quotes.updateLine(input.tenantId, input.lineId, lineData)
  await quotes.recalculateTotals(input.tenantId, input.quoteId)

  await audit.append({
    eventType: "quote.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: input.quoteId,
    action: "quote.line_updated",
    metadata: {
      quoteNumber: quote.quoteNumber,
      lineId: input.lineId,
      unitPrice: input.data.unitPrice,
    },
    requestId: input.requestId,
    source: "web",
  })

  return line
}
