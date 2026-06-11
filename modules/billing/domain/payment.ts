import type { UUID } from "@/types/shared"

// ── Status ──────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = ["recorded", "reversed"] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  recorded: "Registrado",
  reversed: "Reversado",
}

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  recorded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  reversed: "bg-red-500/10 text-red-700 dark:text-red-400",
}

// ── Method (open attribute; suggested list for the UI) ────────────────────────

export const PAYMENT_METHODS = [
  "transfer",
  "cash",
  "check",
  "card",
  "other",
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  check: "Cheque",
  card: "Tarjeta",
  other: "Otro",
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type Payment = {
  id: UUID
  paymentNumber: string
  companyId: UUID
  paymentDate: string
  method: string
  reference: string | null
  note: string | null
  amount: number
  status: PaymentStatus
  reversedAt: string | null
  reversedBy: UUID | null
  reverseReason: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentListItem = Payment & {
  companyName: string | null
}

export type PaymentAllocation = {
  id: UUID
  paymentId: UUID
  invoiceId: UUID
  invoiceNumber: string | null
  amount: number
}

export type PaymentDetail = Payment & {
  companyName: string | null
  allocations: PaymentAllocation[]
}

// ── Input types ──────────────────────────────────────────────────────────────

export type PaymentAllocationInput = {
  invoiceId: UUID
  amount: number
}

export type RecordPaymentInput = {
  companyId: UUID
  paymentDate: string
  method: string
  reference: string | null
  note: string | null
  allocations: PaymentAllocationInput[]
}

export type PaymentListQuery = {
  status: PaymentStatus | null
  companyId: UUID | null
  page: number
  pageSize: number
}

/** An issued/partially-paid invoice with an outstanding balance (for the form). */
export type OpenInvoiceOption = {
  id: UUID
  invoiceNumber: string | null
  totalAmount: number
  balance: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function totalAllocated(allocations: PaymentAllocationInput[]): number {
  return allocations.reduce((sum, a) => sum + a.amount, 0)
}

export function canReversePayment(status: PaymentStatus): boolean {
  return status === "recorded"
}
