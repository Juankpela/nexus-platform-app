import { describe, expect, it } from "vitest"

import type { InvoiceListItem } from "@/modules/billing/domain/invoice"
import type { QuoteListItem } from "@/modules/crm/domain/quote"
import { buildOwnerDashboard } from "@/modules/platform/application/owner-dashboard"

const TODAY = "2026-06-15"

function inv(p: Partial<InvoiceListItem>): InvoiceListItem {
  return {
    id: "i",
    invoiceNumber: "F-1",
    originType: "manual" as never,
    workOrderId: null,
    quoteId: null,
    companyId: "c",
    contactId: null,
    status: "issued",
    currency: "COP",
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    amountPaid: 0,
    balance: 0,
    issueDate: null,
    dueDate: null,
    paymentTerms: null,
    notes: null,
    voidReason: null,
    createdAt: "",
    updatedAt: "",
    companyName: null,
    ...p,
  }
}
function quote(p: Partial<QuoteListItem>): QuoteListItem {
  return {
    id: "q",
    quoteNumber: "Q-1",
    version: 1,
    opportunityId: null,
    companyId: null,
    contactId: null,
    priceBookId: null,
    status: "accepted",
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    expirationDate: null,
    notes: null,
    publicToken: null,
    createdAt: "",
    updatedAt: "",
    companyName: null,
    ...p,
  }
}

describe("buildOwnerDashboard — sales this month", () => {
  it("sums non-void invoices issued in the current month only", () => {
    const r = buildOwnerDashboard({
      invoices: [
        inv({ id: "a", totalAmount: 1000, issueDate: "2026-06-01" }),
        inv({ id: "b", totalAmount: 500, issueDate: "2026-06-30" }),
        inv({ id: "c", totalAmount: 999, issueDate: "2026-05-31" }), // last month
        inv({ id: "d", totalAmount: 999, issueDate: "2026-06-10", status: "void" }), // void
        inv({ id: "e", totalAmount: 200, issueDate: null }), // no date
      ],
      acceptedQuotes: null,
      openWorkOrders: null,
      unscheduledWorkOrders: 0,
      todayISO: TODAY,
    })
    expect(r.salesThisMonth).toBe(1500)
  })
})

describe("buildOwnerDashboard — receivable & overdue", () => {
  it("sums balance of issued/partially_paid and counts overdue", () => {
    const r = buildOwnerDashboard({
      invoices: [
        inv({ id: "a", status: "issued", balance: 800, dueDate: "2026-06-30" }),
        inv({ id: "b", status: "partially_paid", balance: 200, dueDate: "2026-06-01" }), // overdue
        inv({ id: "c", status: "paid", balance: 0, dueDate: "2026-01-01" }), // not receivable
        inv({ id: "d", status: "issued", balance: 100, dueDate: "2026-06-14" }), // overdue
      ],
      acceptedQuotes: null,
      openWorkOrders: null,
      unscheduledWorkOrders: 0,
      todayISO: TODAY,
    })
    expect(r.receivable).toBe(1100)
    expect(r.overdueInvoices).toBe(2)
  })
})

describe("buildOwnerDashboard — quotes ready to invoice", () => {
  it("counts accepted quotes without a non-void invoice", () => {
    const r = buildOwnerDashboard({
      invoices: [
        inv({ id: "i1", quoteId: "q1", status: "issued" }), // q1 invoiced
        inv({ id: "i2", quoteId: "q2", status: "void" }), // void → q2 still ready
      ],
      acceptedQuotes: [quote({ id: "q1" }), quote({ id: "q2" }), quote({ id: "q3" })],
      openWorkOrders: null,
      unscheduledWorkOrders: 0,
      todayISO: TODAY,
    })
    expect(r.quotesReadyToInvoice).toBe(2) // q2 (void invoice) + q3 (none)
  })
})

describe("buildOwnerDashboard — attention & nulls", () => {
  it("builds attention rows only when counts > 0", () => {
    const r = buildOwnerDashboard({
      invoices: [inv({ status: "issued", balance: 10, dueDate: "2026-06-01" })],
      acceptedQuotes: [quote({ id: "q9" })],
      openWorkOrders: 4,
      unscheduledWorkOrders: 2,
      todayISO: TODAY,
    })
    expect(r.activeWorkOrders).toBe(4)
    expect(r.attention.map((a) => a.key)).toEqual(["overdue", "ready", "unscheduled"])
  })

  it("returns nulls and empty attention for an empty tenant", () => {
    const r = buildOwnerDashboard({
      invoices: null,
      acceptedQuotes: null,
      openWorkOrders: null,
      unscheduledWorkOrders: 0,
      todayISO: TODAY,
    })
    expect(r).toMatchObject({
      salesThisMonth: null,
      receivable: null,
      overdueInvoices: 0,
      activeWorkOrders: null,
      quotesReadyToInvoice: 0,
      attention: [],
    })
  })
})
