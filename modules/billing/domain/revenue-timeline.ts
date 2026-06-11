import type { UUID } from "@/types/shared"

/**
 * Revenue Timeline — a BUSINESS view of a customer's economic relationship, NOT an
 * accounting tool. It consolidates events from Quotes, Work Orders, Invoices and
 * Payments and answers only: what was sold, executed, invoiced, paid, and what
 * balance remains. No ledgers, cost centers, advanced taxes, or reconciliation.
 *
 * Read-only and derived — no tables of its own. Designed to be the seed of the
 * future Customer Portal, Analytics and Revenue Dashboard, so events are typed,
 * navigable to their origin, and amounts are explicit.
 */

export type RevenueEventType = "quote" | "work_order" | "invoice" | "payment"

export const REVENUE_EVENT_LABELS: Record<RevenueEventType, string> = {
  quote: "Cotización",
  work_order: "Orden de trabajo",
  invoice: "Factura",
  payment: "Pago",
}

export type RevenueTimelineEvent = {
  id: UUID
  type: RevenueEventType
  /** ISO date used for chronological ordering and display. */
  date: string
  /** Short identifier shown to the user (e.g. invoice/quote/WO/payment number). */
  title: string
  /** Status or short context (e.g. invoice status, WO status). */
  detail: string | null
  /** Monetary amount where relevant (invoice/quote total, payment amount). */
  amount: number | null
  /** Tenant-relative path to the origin document (UI prepends /app/{slug}/). Null = no detail page. */
  href: string | null
  /** Raw status string for badge coloring at the UI layer. */
  status: string | null
}

/** The three numbers that matter — derived from invoices (single source). */
export type CustomerRevenueSummary = {
  /** Facturado: total of non-draft, non-void invoices. */
  invoiced: number
  /** Cobrado: amount applied to those invoices. */
  paid: number
  /** Saldo pendiente: invoiced − paid. */
  balance: number
}

export type CustomerRevenueTimeline = {
  summary: CustomerRevenueSummary
  events: RevenueTimelineEvent[]
}
