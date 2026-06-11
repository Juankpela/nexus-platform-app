import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { PaymentRepository } from "@/modules/billing/application/ports/payment-repository"
import { computeBalance } from "@/modules/billing/domain/invoice"
import {
  totalAllocated,
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
    const invoiceIds = input.allocations.map((a) => a.invoiceId)

    // Validate target invoices and balances before writing anything.
    const { data: invoices, error: invErr } = await client
      .from("invoices")
      .select("id, total_amount, amount_paid, status")
      .eq("tenant_id", tenantId)
      .in("id", invoiceIds)

    if (invErr) {
      throw new ApplicationError(
        "Unable to load invoices for payment.",
        "PAYMENT_INVOICES_LOAD_FAILED",
        invErr,
      )
    }

    const byId = new Map((invoices ?? []).map((i) => [i.id as string, i]))
    for (const alloc of input.allocations) {
      const inv = byId.get(alloc.invoiceId)
      if (!inv) {
        throw new ApplicationError("Invoice not found.", "INVOICE_NOT_FOUND")
      }
      if (inv.status !== "issued" && inv.status !== "partially_paid") {
        throw new ApplicationError(
          "Only issued invoices can receive payments.",
          "INVOICE_NOT_PAYABLE",
        )
      }
      const balance = computeBalance(
        Number(inv.total_amount),
        Number(inv.amount_paid),
      )
      if (alloc.amount > balance + 0.0001) {
        throw new ApplicationError(
          "Allocation exceeds the invoice balance.",
          "PAYMENT_OVER_ALLOCATION",
        )
      }
    }

    // Generate the consecutive payment number.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: paymentNumber, error: seqError } = await (client.rpc as any)(
      "next_payment_number",
      { p_tenant_id: tenantId },
    )
    if (seqError || !paymentNumber) {
      throw new ApplicationError(
        "Unable to generate payment number.",
        "PAYMENT_NUMBER_FAILED",
        seqError,
      )
    }

    const amount = totalAllocated(input.allocations)
    const { data: paymentRow, error: payErr } = await client
      .from("payments")
      .insert({
        tenant_id: tenantId,
        payment_number: paymentNumber as string,
        company_id: input.companyId,
        payment_date: input.paymentDate,
        method: input.method,
        reference: input.reference,
        note: input.note,
        amount,
        status: "recorded",
      })
      .select("*")
      .single()

    if (payErr || !paymentRow) {
      throw new ApplicationError(
        "Unable to record payment.",
        "PAYMENT_RECORD_FAILED",
        payErr,
      )
    }

    const payment = toPayment(paymentRow as unknown as Record<string, unknown>)

    const { error: allocErr } = await client.from("payment_allocations").insert(
      input.allocations.map((a) => ({
        tenant_id: tenantId,
        payment_id: payment.id,
        invoice_id: a.invoiceId,
        amount: a.amount,
      })),
    )
    if (allocErr) {
      throw new ApplicationError(
        "Unable to allocate payment.",
        "PAYMENT_ALLOCATE_FAILED",
        allocErr,
      )
    }

    // Apply each allocation to its invoice balance/status.
    for (const alloc of input.allocations) {
      const inv = byId.get(alloc.invoiceId)!
      const total = Number(inv.total_amount)
      const newPaid = Number(inv.amount_paid) + alloc.amount
      const newStatus = newPaid >= total - 0.0001 ? "paid" : "partially_paid"
      await client
        .from("invoices")
        .update({ amount_paid: newPaid, status: newStatus })
        .eq("tenant_id", tenantId)
        .eq("id", alloc.invoiceId)
    }

    return payment
  }

  async reverse(
    tenantId: UUID,
    id: UUID,
    reversedBy: UUID,
    reversedAt: string,
    reason: string,
  ): Promise<void> {
    const client = await createServerSupabaseClient()

    const { data: allocations, error: allocErr } = await client
      .from("payment_allocations")
      .select("invoice_id, amount")
      .eq("tenant_id", tenantId)
      .eq("payment_id", id)

    if (allocErr) {
      throw new ApplicationError(
        "Unable to load payment allocations.",
        "PAYMENT_ALLOCATIONS_LOAD_FAILED",
        allocErr,
      )
    }

    // Recompute each affected invoice's balance/status.
    for (const alloc of allocations ?? []) {
      const { data: inv } = await client
        .from("invoices")
        .select("total_amount, amount_paid")
        .eq("tenant_id", tenantId)
        .eq("id", alloc.invoice_id as string)
        .maybeSingle()
      if (!inv) continue

      const total = Number(inv.total_amount)
      const newPaid = Math.max(0, Number(inv.amount_paid) - Number(alloc.amount))
      const newStatus =
        newPaid <= 0.0001
          ? "issued"
          : newPaid >= total - 0.0001
            ? "paid"
            : "partially_paid"
      await client
        .from("invoices")
        .update({ amount_paid: newPaid, status: newStatus })
        .eq("tenant_id", tenantId)
        .eq("id", alloc.invoice_id as string)
    }

    const { error } = await client
      .from("payments")
      .update({
        status: "reversed",
        reversed_at: reversedAt,
        reversed_by: reversedBy,
        reverse_reason: reason,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to reverse payment.",
        "PAYMENT_REVERSE_FAILED",
        error,
      )
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
