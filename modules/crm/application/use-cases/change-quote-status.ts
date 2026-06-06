import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import {
  QUOTE_STATUS_TRANSITIONS,
  type QuoteStatus,
} from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

export type ChangeQuoteStatusDeps = {
  quotes: QuoteRepository
  audit: AuditRepository
}

export type ChangeQuoteStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: QuoteStatus
}

/** Map from target status to the audit event name. */
const EVENT_TYPE: Partial<Record<QuoteStatus, string>> = {
  sent: "quote.sent",
  approved: "quote.approved",
  rejected: "quote.rejected",
  accepted: "quote.accepted",
}

export async function changeQuoteStatus(
  { quotes, audit }: ChangeQuoteStatusDeps,
  input: ChangeQuoteStatusInput,
): Promise<void> {
  const existing = await quotes.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
  }

  const allowed = QUOTE_STATUS_TRANSITIONS[existing.status]
  if (!allowed.includes(input.status)) {
    throw new ApplicationError(
      `Cannot move a ${existing.status} quote to ${input.status}.`,
      "INVALID_STATUS_TRANSITION",
    )
  }

  await quotes.setStatus(input.tenantId, input.id, input.status)

  const eventType = EVENT_TYPE[input.status] ?? "quote.updated"
  await audit.append({
    eventType,
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "quote",
    subjectId: input.id,
    action: eventType,
    metadata: {
      quoteNumber: existing.quoteNumber,
      version: existing.version,
      from: existing.status,
      to: input.status,
    },
    requestId: input.requestId,
    source: "web",
  })
}
