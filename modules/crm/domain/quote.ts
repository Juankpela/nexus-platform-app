import type { UUID } from "@/types/shared"

// ── Status ──────────────────────────────────────────────────────────────────

export const QUOTE_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "sent",
  "accepted",
  "expired",
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  sent: "Sent",
  accepted: "Accepted",
  expired: "Expired",
}

/** Valid next statuses for each current status. */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["pending_approval", "sent"],
  pending_approval: ["approved", "rejected"],
  approved: ["sent"],
  rejected: [],
  sent: ["accepted", "expired"],
  accepted: [],
  expired: [],
}

/** Label for the action button that triggers the transition. */
export const QUOTE_STATUS_ACTION_LABELS: Partial<Record<QuoteStatus, string>> =
  {
    pending_approval: "Submit for Approval",
    approved: "Approve",
    rejected: "Reject",
    sent: "Mark as Sent",
    accepted: "Mark as Accepted",
    expired: "Mark as Expired",
  }

/** CSS classes for status badges. */
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-400",
  sent: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  accepted: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
  expired: "bg-muted text-muted-foreground",
}

// ── Domain types ─────────────────────────────────────────────────────────────

/** Flat quote row (list view). */
export type Quote = {
  id: UUID
  quoteNumber: string
  version: number
  opportunityId: UUID | null
  companyId: UUID | null
  contactId: UUID | null
  priceBookId: UUID | null
  status: QuoteStatus
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  expirationDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Quote enriched with joined entity names (detail view). */
export type QuoteDetail = Quote & {
  companyName: string | null
  contactName: string | null
  opportunityName: string | null
  priceBookName: string | null
}

/** Quote list item — includes companyName for display without full join. */
export type QuoteListItem = Quote & {
  companyName: string | null
}

export type QuoteLine = {
  id: UUID
  quoteId: UUID
  productId: UUID
  productName: string
  productSku: string | null
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ── Input types ──────────────────────────────────────────────────────────────

export type QuoteInput = {
  opportunityId: UUID | null
  companyId: UUID | null
  contactId: UUID | null
  priceBookId: UUID | null
  expirationDate: string | null
  notes: string | null
  discountAmount: number
  taxAmount: number
}

export type QuoteLineInput = {
  productId: UUID
  quantity: number
  unitPrice: number
  discountAmount: number
  notes: string | null
  sortOrder: number
}

export type QuoteListQuery = {
  search: string | null
  status: QuoteStatus | null
  companyId: UUID | null
  page: number
  pageSize: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function computeLineTotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
): number {
  return Math.max(0, quantity * unitPrice - discountAmount)
}

export function computeQuoteTotal(
  subtotal: number,
  discountAmount: number,
  taxAmount: number,
): number {
  return Math.max(0, subtotal - discountAmount + taxAmount)
}

/** Products with an optional default price from the selected price book. */
export type ProductLineOption = {
  id: UUID
  name: string
  sku: string | null
  defaultUnitPrice: number | null
}

export type OpportunityOption = {
  id: UUID
  name: string
}

export type PriceBookOption = {
  id: UUID
  name: string
}
