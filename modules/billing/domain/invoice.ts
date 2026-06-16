import type { UUID } from "@/types/shared"

// ── Status ──────────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "void",
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  issued: "Emitida",
  partially_paid: "Parcialmente pagada",
  paid: "Pagada",
  void: "Anulada",
}

/**
 * Valid next statuses per current status.
 * `partially_paid` and `paid` are driven by Payments (E3), not manual transitions.
 * Manual transitions in E1 are: draft → issued, and issued/partially_paid → void.
 */
export const INVOICE_STATUS_TRANSITIONS: Record<
  InvoiceStatus,
  InvoiceStatus[]
> = {
  draft: ["issued"],
  issued: ["partially_paid", "paid", "void"],
  partially_paid: ["paid", "void"],
  paid: [],
  void: [],
}

/** CSS classes for status badges (aligned with Nexus brand tokens). */
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  partially_paid: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  paid: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
  void: "bg-red-500/10 text-red-700 dark:text-red-400",
}

/** An issued invoice is immutable: no edits to header or lines. */
export function isInvoiceMutable(status: InvoiceStatus): boolean {
  return status === "draft"
}

/** Whether an invoice may still be voided. */
export function canVoidInvoice(status: InvoiceStatus): boolean {
  return status === "issued" || status === "partially_paid"
}

// ── Origin (polymorphic) ──────────────────────────────────────────────────────
//
// FROZEN DOMAIN RULE (2026-06-11): an Invoice may originate ONLY from a Work Order
// (service sold / service request) or a Quote (product sale) — never from a Case,
// Opportunity or Lead. Sales Order was removed from Nexus entirely. Enforced
// structurally: only these two origin types exist, the DB CHECK requires exactly one
// of work_order/quote, and no code path constructs an invoice from anything else.

export const INVOICE_ORIGIN_TYPES = ["work_order", "quote"] as const

export type InvoiceOriginType = (typeof INVOICE_ORIGIN_TYPES)[number]

export const INVOICE_ORIGIN_LABELS: Record<InvoiceOriginType, string> = {
  work_order: "Orden de trabajo",
  quote: "Cotización",
}

// ── Domain types ─────────────────────────────────────────────────────────────

/** Flat invoice row (list view). */
export type Invoice = {
  id: UUID
  /** Null while draft; consecutive fiscal number assigned at issuance. */
  invoiceNumber: string | null
  originType: InvoiceOriginType
  workOrderId: UUID | null
  quoteId: UUID | null
  companyId: UUID
  contactId: UUID | null
  status: InvoiceStatus
  currency: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  /** Derived: totalAmount − amountPaid. */
  balance: number
  issueDate: string | null
  dueDate: string | null
  paymentTerms: string | null
  notes: string | null
  voidReason: string | null
  createdAt: string
  updatedAt: string
}

/** Invoice enriched with joined entity names (detail view). */
export type InvoiceDetail = Invoice & {
  companyName: string | null
  contactName: string | null
  workOrderNumber: string | null
  quoteNumber: string | null
}

/** Invoice list item — includes companyName for display without full join. */
export type InvoiceListItem = Invoice & {
  companyName: string | null
}

export type InvoiceLine = {
  id: UUID
  invoiceId: UUID
  productId: UUID | null
  description: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ── Input types ──────────────────────────────────────────────────────────────

/** Header fields editable while a draft. */
export type InvoiceDraftInput = {
  contactId: UUID | null
  dueDate: string | null
  paymentTerms: string | null
  notes: string | null
}

export type InvoiceLineInput = {
  productId: UUID | null
  description: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  sortOrder: number
}

export type InvoiceListQuery = {
  search: string | null
  status: InvoiceStatus | null
  companyId: UUID | null
  page: number
  pageSize: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Net amount of a line before tax. */
export function computeLineNet(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
): number {
  return Math.max(0, quantity * unitPrice - discountAmount)
}

/** Tax amount for a line, given its net and tax rate (e.g. 0.19 for 19% IVA). */
export function computeLineTax(net: number, taxRate: number): number {
  return Math.max(0, net * taxRate)
}

/** Total of a line including its own tax. */
export function computeLineTotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
  taxRate: number,
): number {
  const net = computeLineNet(quantity, unitPrice, discountAmount)
  return net + computeLineTax(net, taxRate)
}

/** Header total: subtotal (net) − header discount + total tax. */
export function computeInvoiceTotal(
  subtotal: number,
  discountAmount: number,
  taxAmount: number,
): number {
  return Math.max(0, subtotal - discountAmount + taxAmount)
}

export function computeBalance(totalAmount: number, amountPaid: number): number {
  return Math.max(0, totalAmount - amountPaid)
}
