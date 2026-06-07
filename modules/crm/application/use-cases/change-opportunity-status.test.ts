import { describe, expect, it, vi } from "vitest"

import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { OpportunityRepository } from "@/modules/crm/application/ports/opportunity-repository"
import { changeOpportunityStatus } from "@/modules/crm/application/use-cases/change-opportunity-status"
import type {
  Opportunity,
  OpportunityStatus,
} from "@/modules/crm/domain/opportunity"

const TENANT = "11111111-1111-1111-1111-111111111111"
const OPP = "22222222-2222-2222-2222-222222222222"
const ACTOR = "33333333-3333-3333-3333-333333333333"
const REQUEST = "44444444-4444-4444-4444-444444444444"

function fakeOpportunity(status: OpportunityStatus): Opportunity {
  return { id: OPP, status } as Opportunity
}

function setup(status: OpportunityStatus) {
  const setStatus = vi.fn().mockResolvedValue(undefined)
  const append = vi.fn().mockResolvedValue(undefined)
  const opportunities = {
    getById: vi.fn().mockResolvedValue(fakeOpportunity(status)),
    setStatus,
  } as unknown as OpportunityRepository
  const audit = { append } as unknown as AuditRepository
  return { opportunities, audit, setStatus, append }
}

const input = (status: OpportunityStatus) => ({
  actorId: ACTOR,
  tenantId: TENANT,
  requestId: REQUEST,
  id: OPP,
  status,
})

describe("changeOpportunityStatus", () => {
  it("allows a valid open-stage transition and audits it", async () => {
    const { opportunities, audit, setStatus, append } = setup("new")
    await changeOpportunityStatus({ opportunities, audit }, input("negotiation"))

    expect(setStatus).toHaveBeenCalledWith(TENANT, OPP, "negotiation")
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ action: "opportunity.status_changed" }),
    )
  })

  it("emits the won event when closing as won", async () => {
    const { opportunities, audit, append } = setup("negotiation")
    await changeOpportunityStatus({ opportunities, audit }, input("won"))

    const actions = append.mock.calls.map((c) => c[0].action)
    expect(actions).toContain("opportunity.status_changed")
    expect(actions).toContain("opportunity.won")
  })

  it("rejects reopening a won (terminal) opportunity", async () => {
    const { opportunities, audit, setStatus, append } = setup("won")
    await expect(
      changeOpportunityStatus({ opportunities, audit }, input("new")),
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" })

    expect(setStatus).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })

  it("rejects reopening a lost (terminal) opportunity", async () => {
    const { opportunities, audit, setStatus } = setup("lost")
    await expect(
      changeOpportunityStatus({ opportunities, audit }, input("negotiation")),
    ).rejects.toBeInstanceOf(ApplicationError)
    expect(setStatus).not.toHaveBeenCalled()
  })

  it("is a no-op when the status is unchanged", async () => {
    const { opportunities, audit, setStatus, append } = setup("proposal")
    await changeOpportunityStatus({ opportunities, audit }, input("proposal"))
    expect(setStatus).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })

  it("throws when the opportunity does not exist", async () => {
    const opportunities = {
      getById: vi.fn().mockResolvedValue(null),
      setStatus: vi.fn(),
    } as unknown as OpportunityRepository
    const audit = { append: vi.fn() } as unknown as AuditRepository

    await expect(
      changeOpportunityStatus({ opportunities, audit }, input("won")),
    ).rejects.toMatchObject({ code: "OPPORTUNITY_NOT_FOUND" })
  })
})
