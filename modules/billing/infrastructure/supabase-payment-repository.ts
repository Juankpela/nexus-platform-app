import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { PaymentRepository } from "@/modules/billing/application/ports/payment-repository"
import { computeBalance } from "@/modules/billing/domain/invoice"
import {
  type OpenInvoiceOption,
  type Payment,
  type PaymentAllocation,
  type PaymentDetail,
  type PaymentListItem,
  type PaymentListQuery,
  type PaymentStatus,
  type RecordPaymentInput,
} from "@/modules/billing/domain/payment"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

// ── Error mapping (RPC → ApplicationError) ───────────────────────────────────
// Las RPCs atómicas lanzan RAISE EXCEPTION con un token; PostgREST lo entrega en
// error.message. Lo traducimos al mismo ApplicationError code que usaba el flujo
// secuencial para no cambiar el comportamiento visible (UI / use-cases).
const PAYMENT_RPC_ERROR_CODES = [
  "PAYMENT_OVER_ALLOCATION",
  "INVOICE_NOT_PAYABLE",
  "INVOICE_NOT_FOUND",
  "PAYMENT_NO_ALLOCATIONS",
  "PAYMENT_INVALID_AMOUNT",
  "PAYMENT_FORBIDDEN",
  "PAYMENT_NOT_FOUND",
  "PAYMENT_NOT_REVERSIBLE",
] as const

function mapPaymentRpcError(error: unknown, fallbackCode: string): ApplicationError {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : ""
  const known = PAYMENT_RPC_ERROR_CODES.find((code) => message.includes(code))
  if (known) return new ApplicationError(message, known)
  return new ApplicationError("Unable to process payment.", fallbackCode, error)
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function toPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    paymentNumber: row.payment_number as string,
    companyId: row.company_id as string,
    paymentDate: row.payment_date as string,
    method: row.method as string,
    reference: (row.reference as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    amount: Number(row.amount),
    status: row.status as PaymentStatus,
    reversedAt: (row.reversed_at as string | null) ?? null,
    reversedBy: (row.reversed_by as string | null) ?? null,
    reverseReason: (row.reverse_reason as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ── Repository ──────────────────────────────────────────────────────────────────

export class SupabasePaymentRepository implements PaymentRepository {
  async list(
    tenantId: UUID,
    { status, companyId, page, pageSize }: PaymentListQuery,
  ): Promise<Paginated<PaymentListItem>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("payments")
      .select("*, companies(name)", { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (status) query = query.eq("status", status)
    if (companyId) query = query.eq("company_id", companyId)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list payments.",
        "PAYMENT_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map((row) => {
        const co = Array.isArray(row.companies) ? row.companies[0] : row.companies
        return {
          ...toPayment(row as unknown as Record<string, unknown>),
          companyName: (co?.name as string | null) ?? null,
        }
      }),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<PaymentDetail | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("payments")
      .select(
        "*, companies(name), payment_allocations(id, payment_id, invoice_id, amount, invoices(invoice_number))",
      )
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load payment.",
        "PAYMENT_LOAD_FAILED",
        error,
      )
    }
    if (!data) return null

    const co = Array.isArray(data.companies) ? data.companies[0] : data.companies
    return {
      ...toPayment(data as unknown as Record<string, unknown>),
      companyName: (co?.name as string | null) ?? null,
      allocations: mapAllocations(data.payment_allocations),
    }
  }

  async listForInvoice(
    tenantId: UUID,
    invoiceId: UUID,
  ): Promise<PaymentDetail[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("payment_allocations")
      .select(
        "amount, invoice_id, payments(*, companies(name))",
      )
      .eq("tenant_id", tenantId)
      .eq("invoice_id", invoiceId)

    if (error) {
      throw new ApplicationError(
        "Unable to load invoice payments.",
        "PAYMENT_INVOICE_LOAD_FAILED",
        error,
      )
    }

    return (data ?? []).map((row) => {
      const p = Array.isArray(row.payments) ? row.payments[0] : row.payments
      const co = p && Array.isArray(p.companies) ? p.companies[0] : p?.companies
      const payment = toPayment(p as unknown as Record<string, unknown>)
      return {
        ...payment,
        companyName: (co?.name as string | null) ?? null,
        allocations: [
          {
            id: payment.id,
            paymentId: payment.id,
            invoiceId,
            invoiceNumber: null,
            amount: Number(row.amount),
          },
        ],
      }
    })
  }

  async listOpenInvoices(
    tenantId: UUID,
    companyId: UUID,
  ): Promise<OpenInvoiceOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .select("id, invoice_number, total_amount, amount_paid")
      .eq("tenant_id", tenantId)
      .eq("company_id", companyId)
      .in("status", ["issued", "partially_paid"])
      .order("created_at", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to load open invoices.",
        "OPEN_INVOICES_FAILED",
        error,
      )
    }

    return (data ?? [])
      .map((r) => {
        const total = Number(r.total_amount)
        const balance = computeBalance(total, Number(r.amount_paid))
        return {
          id: r.id as string,
          invoiceNumber: (r.invoice_number as string | null) ?? null,
          totalAmount: total,
          balance,
        }
      })
      .filter((o) => o.balance > 0)
  }

  async record(tenantId: UUID, input: RecordPaymentInput): Promise<Payment> {
    const client = await createServerSupabaseClient()

    // P0-3 — todo el flujo (validar saldos con FOR UPDATE, generar consecutivo,
    // insertar pago + asignaciones, aplicar incremento relativo a cada factura)
    // ocurre atómicamente dentro de la RPC. Un fallo revierte TODO; dos pagos
    // concurrentes se serializan (no se pisan ni sobre-asignan).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client.rpc as any)("record_payment", {
      p_tenant_id: tenantId,
      p_company_id: input.companyId,
      p_payment_date: input.paymentDate,
      p_method: input.method,
      p_reference: input.reference,
      p_note: input.note,
      p_allocations: input.allocations.map((a) => ({
        invoice_id: a.invoiceId,
        amount: a.amount,
      })),
    })

    if (error || !data) {
      throw mapPaymentRpcError(error, "PAYMENT_RECORD_FAILED")
    }
    return toPayment(data as unknown as Record<string, unknown>)
  }

  async reverse(
    tenantId: UUID,
    id: UUID,
    reversedBy: UUID,
    reversedAt: string,
    reason: string,
  ): Promise<void> {
    const client = await createServerSupabaseClient()

    // P0-3 — reversa atómica: bloquea el pago (idempotencia: no se reversa dos
    // veces), revierte el saldo de cada factura y marca el pago, todo en una
    // transacción.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client.rpc as any)("reverse_payment", {
      p_tenant_id: tenantId,
      p_payment_id: id,
      p_reversed_by: reversedBy,
      p_reversed_at: reversedAt,
      p_reason: reason,
    })

    if (error) {
      throw mapPaymentRpcError(error, "PAYMENT_REVERSE_FAILED")
    }
  }
}

function mapAllocations(raw: unknown): PaymentAllocation[] {
  if (!Array.isArray(raw)) return []
  return raw.map((a) => {
    const inv = Array.isArray(a.invoices) ? a.invoices[0] : a.invoices
    return {
      id: a.id as string,
      paymentId: a.payment_id as string,
      invoiceId: a.invoice_id as string,
      invoiceNumber: (inv?.invoice_number as string | null) ?? null,
      amount: Number(a.amount),
    }
  })
}
