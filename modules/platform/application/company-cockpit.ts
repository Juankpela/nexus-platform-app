import type { InvoiceListItem } from "@/modules/billing/domain/invoice"
import type { QuoteListItem } from "@/modules/crm/domain/quote"
import type { WorkOrder } from "@/modules/service/domain/work-order"
import { isWorkOrderInvoiceable } from "@/modules/service/domain/work-order"

/**
 * Customer page view-model: financial snapshot + the single next action for this
 * client. Pure — receives lists the page already fetched (by companyId) plus the
 * authoritative revenue summary. No queries, no persistence.
 */

export type CompanyFinancials = {
  /** Facturado: emitido no anulado (revenue summary, autoritativo). */
  invoiced: number
  /** Por cobrar: saldo pendiente (revenue summary). */
  outstanding: number
  /** Vencido: saldo de facturas emitidas/parciales pasadas de fecha. */
  overdue: number
  /** Trabajos no terminales (ni completados ni cancelados). */
  openWorkOrders: number
  /** Cotizaciones aún en juego (no aceptadas/rechazadas/vencidas). */
  pendingQuotes: number
}

export type CompanyNextAction = {
  title: string
  description: string
  ctaLabel: string
  /** Path segment under /app/{slug}; the page builds the full href with targetId. */
  segment: "invoices" | "quotes" | "work-orders"
  targetId: string
}

const TERMINAL_WO = new Set(["completed", "cancelled"])
const PENDING_QUOTE = new Set(["draft", "pending_approval", "approved", "sent"])
const OVERDUE_INVOICE = new Set(["issued", "partially_paid"])

export function buildCompanyFinancials(input: {
  invoiced: number
  outstanding: number
  invoices: InvoiceListItem[]
  quotes: QuoteListItem[]
  workOrders: WorkOrder[]
  todayISO: string
}): CompanyFinancials {
  const overdue = input.invoices
    .filter(
      (i) =>
        OVERDUE_INVOICE.has(i.status) &&
        i.dueDate != null &&
        i.dueDate < input.todayISO,
    )
    .reduce((sum, i) => sum + i.balance, 0)

  return {
    invoiced: input.invoiced,
    outstanding: input.outstanding,
    overdue,
    openWorkOrders: input.workOrders.filter((w) => !TERMINAL_WO.has(w.status))
      .length,
    pendingQuotes: input.quotes.filter((q) => PENDING_QUOTE.has(q.status)).length,
  }
}

/**
 * The one recommended action, by priority:
 * 1) factura vencida → cobrar · 2) cotización aceptada → facturar
 * 3) trabajo completado facturable → facturar · 4) trabajo sin programar → programar
 */
export function buildCompanyNextAction(input: {
  invoices: InvoiceListItem[]
  quotes: QuoteListItem[]
  workOrders: WorkOrder[]
  todayISO: string
}): CompanyNextAction | null {
  const overdue = input.invoices.find(
    (i) =>
      OVERDUE_INVOICE.has(i.status) &&
      i.dueDate != null &&
      i.dueDate < input.todayISO,
  )
  if (overdue) {
    return {
      title: "Tienes una factura vencida",
      description: "Registra el pago para recuperar cartera.",
      ctaLabel: "Ir a cobrar",
      segment: "invoices",
      targetId: overdue.id,
    }
  }

  const accepted = input.quotes.find((q) => q.status === "accepted")
  if (accepted) {
    return {
      title: "Cotización aceptada sin facturar",
      description: "Genera la factura para cobrarle al cliente.",
      ctaLabel: "Facturar",
      segment: "quotes",
      targetId: accepted.id,
    }
  }

  const invoiceable = input.workOrders.find((w) => isWorkOrderInvoiceable(w))
  if (invoiceable) {
    return {
      title: "Trabajo completado sin facturar",
      description: "Genera la factura de este trabajo.",
      ctaLabel: "Facturar",
      segment: "work-orders",
      targetId: invoiceable.id,
    }
  }

  const unscheduled = input.workOrders.find((w) => w.status === "new")
  if (unscheduled) {
    return {
      title: "Trabajo sin programar",
      description: "Programa y asigna este trabajo.",
      ctaLabel: "Programar",
      segment: "work-orders",
      targetId: unscheduled.id,
    }
  }

  return null
}
