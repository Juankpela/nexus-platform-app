import { describe, expect, it, vi } from "vitest"

import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import { changeQuoteStatus } from "@/modules/crm/application/use-cases/change-quote-status"
import type { QuoteDetail, QuoteStatus } from "@/modules/crm/domain/quote"

const TENANT = "11111111-1111-1111-1111-111111111111"
const QUOTE = "22222222-2222-2222-2222-222222222222"

function fakeQuote(status: QuoteStatus): QuoteDetail {
  return { id: QUOTE, status, quoteNumber: "Q-2026-001", version: 1 } as QuoteDetail
}

function setup(status: QuoteStatus) {
  const setStatus = vi.fn().mockResolvedValue(undefined)
  const append = vi.fn().mockResolvedValue(undefined)
  const quotes = {
    getById: vi.fn().mockResolvedValue(fakeQuote(status)),
    setStatus,
  } as unknown as QuoteRepository
  const audit = { append } as unknown as AuditRepository
  return { quotes, audit, setStatus, append }
}

const input = (status: QuoteStatus) => ({
  actorId: "33333333-3333-3333-3333-333333333333",
  tenantId: TENANT,
  requestId: "44444444-4444-4444-4444-444444444444",
  id: QUOTE,
  status,
})

describe("changeQuoteStatus", () => {
  it("allows draft -> sent and records the sent event", async () => {
    const { quotes, audit, setStatus, append } = setup("draft")
    await changeQuoteStatus({ quotes, audit }, input("sent"))
    expect(setStatus).toHaveBeenCalledWith(TENANT, QUOTE, "sent")
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "quote.sent" }),
    )
  })

  it("rejects an illegal jump draft -> accepted", async () => {
    const { quotes, audit, setStatus } = setup("draft")
    await expect(
      changeQuoteStatus({ quotes, audit }, input("accepted")),
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" })
    expect(setStatus).not.toHaveBeenCalled()
  })

  it("treats accepted as terminal", async () => {
    const { quotes, audit, setStatus } = setup("accepted")
    await expect(
      changeQuoteStatus({ quotes, audit }, input("sent")),
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" })
    expect(setStatus).not.toHaveBeenCalled()
  })

  it("throws when the quote does not exist", async () => {
    const quotes = {
      getById: vi.fn().mockResolvedValue(null),
      setStatus: vi.fn(),
    } as unknown as QuoteRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository
    await expect(
      changeQuoteStatus({ quotes, audit }, input("sent")),
    ).rejects.toMatchObject({ code: "QUOTE_NOT_FOUND" })
  })
})
