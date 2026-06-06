import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import {
  computeLineTotal,
  type QuoteLine,
  type QuoteLineInput,
} from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type AddQuoteLineDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type AddQuoteLineInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  quoteId: UUID
  data: QuoteLineInput
}

export async function addQuoteLine(
  { quotes, audit }: AddQuoteLineDeps,
  input: AddQuoteLineInput,
): Promise<QuoteLine> {
  const quote = await quotes.getById(input.tenantId, input.quoteId)
  if (!quote) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  // Enforce that modifications only happen on draft/approved quotes
  if (quote.status !== "draft" && quote.status !== "approved") {
    throw new ApplicationError(
      "Lines can only be edited on draft or approved quotes.",
      "QUOTE_NOT_EDITABLE",
    )
  }

  const lineData: QuoteLineInput = {
    ...input.data,
    discountAmount: Math.max(0, input.data.discountAmount),
    lineTotal: computeLineTotal(
      input.data.quantity,
      input.data.unitPrice,
      input.data.discountAmount,
    ),
  } as QuoteLineInput & { lineTotal: number }

  const line = await quotes.addLine(input.tenantId, input.quoteId, lineData)
  await quotes.recalculateTotals(input.tenantId, input.quoteId)

  await audit.append({
    eventType: "quote.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: input.quoteId,
    action: "quote.line_added",
    metadata: {
      quoteNumber: quote.quoteNumber,
      productId: input.data.productId,
      quantity: input.data.quantity,
      unitPrice: input.data.unitPrice,
    },
    requestId: input.requestId,
    source: "web",
  })

  return line
}
