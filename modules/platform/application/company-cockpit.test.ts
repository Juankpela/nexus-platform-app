import { describe, expect, it } from "vitest"

import type { InvoiceListItem } from "@/modules/billing/domain/invoice"
import type { QuoteListItem } from "@/modules/crm/domain/quote"
import type { WorkOrder } from "@/modules/service/domain/work-order"
import {
  buildCompanyFinancials,
  buildCompanyNextAction,
} from "@/modules/platform/application/company-cockpit"

const TODAY = "2026-06-16"

function inv(p: Partial<InvoiceListItem>): InvoiceListItem {
  return { id: "i", status: "issued", balance: 0, dueDate: null, ...p } as InvoiceListItem
}
function quote(p: Partial<QuoteListItem>): QuoteListItem {
  return { id: "q", status: "draft", ...p } as QuoteListItem
}
function wo(p: Partial<WorkOrder>): WorkOrder {
  return {
    id: "w",
    status: "new",
    billable: false,
    billingApprovedAt: null,
    scheduledStart: null,
    ...p,
  } as WorkOrder
}

describe("buildCompanyFinancials", () => {
  it("derives overdue from issued/partially_paid invoices past due", () => {
    const f = buildCompanyFinancials({
      invoiced: 1000,
      outstanding: 400,
      invoices: [
        inv({ status: "issued", balance: 300, dueDate: "2026-06-01" }), // overdue
        inv({ status: "issued", balance: 100, dueDate: "2026-12-01" }), // future
        inv({ status: "paid", balance: 0, dueDate: "2026-01-01" }), // paid
      ],
      quotes: [],
      workOrders: [],
      todayISO: TODAY,
    })
    expect(f.invoiced).toBe(1000)
    expect(f.outstanding).toBe(400)
    expect(f.overdue).toBe(300)
  })

  it("counts open work orders and pending quotes only", () => {
    const f = buildCompanyFinancials({
      invoiced: 0,
      outstanding: 0,
      invoices: [],
      quotes: [quote({ status: "draft" }), quote({ status: "accepted" }), quote({ status: "rejected" })],
      workOrders: [wo({ status: "new" }), wo({ status: "completed" }), wo({ status: "cancelled" })],
      todayISO: TODAY,
    })
    expect(f.openWorkOrders).toBe(1) // only "new"
    expect(f.pendingQuotes).toBe(1) // only "draft"
  })
})

describe("buildCompanyNextAction — priority", () => {
  it("1) overdue invoice wins", () => {
    const a = buildCompanyNextAction({
      invoices: [inv({ id: "ov", status: "issued", balance: 50, dueDate: "2026-01-01" })],
      quotes: [quote({ id: "qa", status: "accepted" })],
      workOrders: [wo({ id: "wb", status: "completed", billable: true, billingApprovedAt: "2026-06-01" })],
      todayISO: TODAY,
    })
    expect(a?.segment).toBe("invoices")
    expect(a?.targetId).toBe("ov")
  })

  it("2) accepted quote when no overdue", () => {
    const a = buildCompanyNextAction({
      invoices: [],
      quotes: [quote({ id: "qa", status: "accepted" })],
      workOrders: [],
      todayISO: TODAY,
    })
    expect(a?.segment).toBe("quotes")
    expect(a?.targetId).toBe("qa")
  })

  it("3) invoiceable work order next", () => {
    const a = buildCompanyNextAction({
      invoices: [],
      quotes: [],
      workOrders: [wo({ id: "wb", status: "completed", billable: true, billingApprovedAt: "2026-06-01" })],
      todayISO: TODAY,
    })
    expect(a?.segment).toBe("work-orders")
    expect(a?.targetId).toBe("wb")
  })

  it("4) unscheduled work order last", () => {
    const a = buildCompanyNextAction({
      invoices: [],
      quotes: [],
      workOrders: [wo({ id: "wn", status: "new" })],
      todayISO: TODAY,
    })
    expect(a?.segment).toBe("work-orders")
    expect(a?.targetId).toBe("wn")
  })

  it("null when nothing is pending", () => {
    const a = buildCompanyNextAction({
      invoices: [inv({ status: "paid", balance: 0 })],
      quotes: [quote({ status: "rejected" })],
      workOrders: [wo({ status: "completed", billable: false })],
      todayISO: TODAY,
    })
    expect(a).toBeNull()
  })
})
