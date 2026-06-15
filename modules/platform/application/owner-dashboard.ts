import type { InvoiceListItem } from "@/modules/billing/domain/invoice"
import type { QuoteListItem } from "@/modules/crm/domain/quote"
import type { AttentionSeverity } from "@/modules/platform/presentation/mission-control"

/** A single actionable row in the owner's "Atención hoy" list. */
export type OwnerAttentionItem = {
  key: string
  label: string
  count: number
  severity: AttentionSeverity
  segment: string
}

export type OwnerDashboard = {
  /** Invoiced this month (issued, non-void). null when billing not readable. */
  salesThisMonth: number | null
  /** Outstanding balance of issued/partially-paid invoices. null when not readable. */
  receivable: number | null
  /** Issued/partially-paid invoices past their due date. */
  overdueInvoices: number
  /** Open work orders. null when service not readable. */
  activeWorkOrders: number | null
  /** Accepted quotes with no (non-void) invoice yet. */
  quotesReadyToInvoice: number
  attention: OwnerAttentionItem[]
}

export type OwnerDashboardInput = {
  /** All non-paginated invoices, or null when billing is not readable. */
  invoices: InvoiceListItem[] | null
  /** Accepted quotes, or null when quotes are not readable. */
  acceptedQuotes: QuoteListItem[] | null
  /** woStats.openCount, or null when service is not readable. */
  openWorkOrders: number | null
  /** Open work orders without an active technician assignment (ADR-031). */
  unassignedWorkOrders: number
  /** Today as YYYY-MM-DD in the tenant timezone. */
  todayISO: string
}

const RECEIVABLE_STATUSES = new Set(["issued", "partially_paid"])

/**
 * Pure aggregation for the owner dashboard block. No data access — receives
 * already-loaded lists and returns the view model. Money sums assume a single
 * currency (COP).
 */
export function buildOwnerDashboard(input: OwnerDashboardInput): OwnerDashboard {
  const { invoices, acceptedQuotes, openWorkOrders, unassignedWorkOrders, todayISO } = input
  const monthPrefix = todayISO.slice(0, 7)

  let salesThisMonth: number | null = null
  let receivable: number | null = null
  let overdueInvoices = 0

  if (invoices) {
    salesThisMonth = 0
    receivable = 0
    for (const inv of invoices) {
      if (inv.status !== "void" && inv.issueDate && inv.issueDate.slice(0, 7) === monthPrefix) {
        salesThisMonth += inv.totalAmount
      }
      if (RECEIVABLE_STATUSES.has(inv.status)) {
        receivable += inv.balance
        if (inv.dueDate && inv.dueDate < todayISO) overdueInvoices += 1
      }
    }
  }

  let quotesReadyToInvoice = 0
  if (acceptedQuotes && invoices) {
    const invoicedQuoteIds = new Set(
      invoices
        .filter((i) => i.quoteId && i.status !== "void")
        .map((i) => i.quoteId as string),
    )
    quotesReadyToInvoice = acceptedQuotes.filter((q) => !invoicedQuoteIds.has(q.id)).length
  }

  const attention: OwnerAttentionItem[] = []
  if (overdueInvoices > 0) {
    attention.push({ key: "overdue", label: "Facturas vencidas", count: overdueInvoices, severity: "critical", segment: "invoices" })
  }
  if (quotesReadyToInvoice > 0) {
    attention.push({ key: "ready", label: "Cotizaciones listas para facturar", count: quotesReadyToInvoice, severity: "warning", segment: "quotes" })
  }
  if (unassignedWorkOrders > 0) {
    attention.push({ key: "unassigned", label: "Órdenes sin asignar", count: unassignedWorkOrders, severity: "info", segment: "dispatch" })
  }

  return {
    salesThisMonth,
    receivable,
    overdueInvoices,
    activeWorkOrders: openWorkOrders,
    quotesReadyToInvoice,
    attention,
  }
}
