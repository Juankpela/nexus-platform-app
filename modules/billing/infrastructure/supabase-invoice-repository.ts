import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { InvoiceRepository } from "@/modules/billing/application/ports/invoice-repository"
import {
  computeBalance,
  computeLineNet,
  computeLineTax,
  computeLineTotal,
  type Invoice,
  type InvoiceDetail,
  type InvoiceDraftInput,
  type InvoiceLine,
  type InvoiceLineInput,
  type InvoiceListItem,
  type InvoiceListQuery,
  type InvoiceOriginType,
  type InvoiceStatus,
} from "@/modules/billing/domain/invoice"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

// ── Mapping helpers ──────────────────────────────────────────────────────────

function toInvoice(row: Record<string, unknown>): Invoice {
  const totalAmount = Number(row.total_amount)
  const amountPaid = Number(row.amount_paid)
  return {
    id: row.id as string,
    invoiceNumber: (row.invoice_number as string | null) ?? null,
    originType: row.origin_type as InvoiceOriginType,
    workOrderId: (row.work_order_id as string | null) ?? null,
    salesOrderId: (row.sales_order_id as string | null) ?? null,
    companyId: row.company_id as string,
    contactId: (row.contact_id as string | null) ?? null,
    status: row.status as InvoiceStatus,
    currency: row.currency as string,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount,
    amountPaid,
    balance: computeBalance(totalAmount, amountPaid),
    issueDate: (row.issue_date as string | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    paymentTerms: (row.payment_terms as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    voidReason: (row.void_reason as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toLine(row: Record<string, unknown>): InvoiceLine {
  return {
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    productId: (row.product_id as string | null) ?? null,
    description: row.description as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discountAmount: Number(row.discount_amount),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    lineTotal: Number(row.line_total),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseInvoiceRepository implements InvoiceRepository {
  // ── List ───────────────────────────────────────────────────────────────────
  async list(
    tenantId: UUID,
    { search, status, companyId, page, pageSize }: InvoiceListQuery,
  ): Promise<Paginated<InvoiceListItem>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("invoices")
      .select("*, companies(name)", { count: "estimated" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) query = query.ilike("invoice_number", `%${term}%`)
    if (status) query = query.eq("status", status)
    if (companyId) query = query.eq("company_id", companyId)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list invoices.",
        "INVOICE_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map((row) => {
        const co = Array.isArray(row.companies)
          ? row.companies[0]
          : row.companies
        return {
          ...toInvoice(row as unknown as Record<string, unknown>),
          companyName: (co?.name as string | null) ?? null,
        }
      }),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────
  async getById(tenantId: UUID, id: UUID): Promise<InvoiceDetail | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .select(
        "*, companies(name), contacts(first_name, last_name), work_orders(work_order_number)",
      )
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load invoice.",
        "INVOICE_LOAD_FAILED",
        error,
      )
    }
    if (!data) return null

    const co = Array.isArray(data.companies)
      ? data.companies[0]
      : data.companies
    const ct = Array.isArray(data.contacts) ? data.contacts[0] : data.contacts
    const wo = Array.isArray(data.work_orders)
      ? data.work_orders[0]
      : data.work_orders

    const contactName = ct
      ? [ct.first_name, ct.last_name].filter(Boolean).join(" ") || null
      : null

    return {
      ...toInvoice(data as unknown as Record<string, unknown>),
      companyName: (co?.name as string | null) ?? null,
      contactName,
      workOrderNumber: (wo?.work_order_number as string | null) ?? null,
    }
  }

  // ── Create from Work Order (E1-H1) ───────────────────────────────────────────
  async createFromWorkOrder(
    tenantId: UUID,
    workOrderId: UUID,
  ): Promise<Invoice> {
    const client = await createServerSupabaseClient()

    const { data: wo, error: woError } = await client
      .from("work_orders")
      .select("id, company_id")
      .eq("tenant_id", tenantId)
      .eq("id", workOrderId)
      .maybeSingle()

    if (woError) {
      throw new ApplicationError(
        "Unable to load work order.",
        "WORK_ORDER_LOAD_FAILED",
        woError,
      )
    }
    if (!wo) {
      throw new ApplicationError("Work order not found.", "WORK_ORDER_NOT_FOUND")
    }
    if (!wo.company_id) {
      throw new ApplicationError(
        "The work order has no company to invoice.",
        "WORK_ORDER_NO_COMPANY",
      )
    }

    const { data, error } = await client
      .from("invoices")
      .insert({
        tenant_id: tenantId,
        origin_type: "work_order",
        work_order_id: workOrderId,
        company_id: wo.company_id,
        status: "draft",
        currency: "COP",
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create invoice.",
        "INVOICE_CREATE_FAILED",
        error,
      )
    }
    return toInvoice(data as unknown as Record<string, unknown>)
  }

  // ── Find active invoice by Work Order (E1-H1 CA4 guard) ──────────────────────
  async findActiveByWorkOrder(
    tenantId: UUID,
    workOrderId: UUID,
  ): Promise<Invoice | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("work_order_id", workOrderId)
      .neq("status", "void")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to check existing invoices.",
        "INVOICE_LOOKUP_FAILED",
        error,
      )
    }
    return data ? toInvoice(data as unknown as Record<string, unknown>) : null
  }

  // ── Update draft (E1-H2) ─────────────────────────────────────────────────────
  async updateDraft(
    tenantId: UUID,
    id: UUID,
    input: InvoiceDraftInput,
  ): Promise<Invoice> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("invoices")
      .update({
        contact_id: input.contactId,
        due_date: input.dueDate,
        payment_terms: input.paymentTerms,
        notes: input.notes,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update invoice.",
        "INVOICE_UPDATE_FAILED",
        error,
      )
    }
    return toInvoice(data as unknown as Record<string, unknown>)
  }

  // ── Issue (E1-H3) ────────────────────────────────────────────────────────────
  async issue(tenantId: UUID, id: UUID, issueDate: string): Promise<Invoice> {
    const client = await createServerSupabaseClient()

    // Atomically generate the consecutive fiscal number.
    // Cast to any because next_invoice_number is not in generated types yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoiceNumber, error: seqError } = await (client.rpc as any)(
      "next_invoice_number",
      { p_tenant_id: tenantId },
    )
    if (seqError || !invoiceNumber) {
      throw new ApplicationError(
        "Unable to generate invoice number.",
        "INVOICE_NUMBER_FAILED",
        seqError,
      )
    }

    const { data, error } = await client
      .from("invoices")
      .update({
        invoice_number: invoiceNumber as string,
        status: "issued",
        issue_date: issueDate,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to issue invoice.",
        "INVOICE_ISSUE_FAILED",
        error,
      )
    }
    return toInvoice(data as unknown as Record<string, unknown>)
  }

  // ── Void (E1-H4) ─────────────────────────────────────────────────────────────
  async void(tenantId: UUID, id: UUID, reason: string): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("invoices")
      .update({ status: "void", void_reason: reason })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to void invoice.",
        "INVOICE_VOID_FAILED",
        error,
      )
    }
  }

  // ── Recalculate totals ─────────────────────────────────────────────────────
  async recalculateTotals(tenantId: UUID, invoiceId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()

    const { data: lines } = await client
      .from("invoice_lines")
      .select("line_total, tax_amount")
      .eq("tenant_id", tenantId)
      .eq("invoice_id", invoiceId)

    const taxAmount = (lines ?? []).reduce(
      (sum, l) => sum + Number(l.tax_amount),
      0,
    )
    // subtotal = net of all lines = lineTotal (incl. tax) − tax
    const subtotal = (lines ?? []).reduce(
      (sum, l) => sum + (Number(l.line_total) - Number(l.tax_amount)),
      0,
    )
    // Header-level discount is 0 in E1 (line-level discounts only).
    const totalAmount = subtotal + taxAmount

    await client
      .from("invoices")
      .update({ subtotal, tax_amount: taxAmount, total_amount: totalAmount })
      .eq("tenant_id", tenantId)
      .eq("id", invoiceId)
  }

  // ── Lines ──────────────────────────────────────────────────────────────────
  async listLines(tenantId: UUID, invoiceId: UUID): Promise<InvoiceLine[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("invoice_lines")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("invoice_id", invoiceId)
      .order("sort_order")
      .order("created_at")

    if (error) {
      throw new ApplicationError(
        "Unable to load invoice lines.",
        "INVOICE_LINES_FAILED",
        error,
      )
    }
    return data.map((row) => toLine(row as unknown as Record<string, unknown>))
  }

  async addLine(
    tenantId: UUID,
    invoiceId: UUID,
    input: InvoiceLineInput,
  ): Promise<InvoiceLine> {
    const client = await createServerSupabaseClient()
    const net = computeLineNet(
      input.quantity,
      input.unitPrice,
      input.discountAmount,
    )
    const taxAmount = computeLineTax(net, input.taxRate)
    const lineTotal = computeLineTotal(
      input.quantity,
      input.unitPrice,
      input.discountAmount,
      input.taxRate,
    )

    const { data, error } = await client
      .from("invoice_lines")
      .insert({
        tenant_id: tenantId,
        invoice_id: invoiceId,
        product_id: input.productId,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        discount_amount: input.discountAmount,
        tax_rate: input.taxRate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        sort_order: input.sortOrder,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to add invoice line.",
        "INVOICE_LINE_ADD_FAILED",
        error,
      )
    }
    return toLine(data as unknown as Record<string, unknown>)
  }

  async updateLine(
    tenantId: UUID,
    lineId: UUID,
    input: InvoiceLineInput,
  ): Promise<InvoiceLine> {
    const client = await createServerSupabaseClient()
    const net = computeLineNet(
      input.quantity,
      input.unitPrice,
      input.discountAmount,
    )
    const taxAmount = computeLineTax(net, input.taxRate)
    const lineTotal = computeLineTotal(
      input.quantity,
      input.unitPrice,
      input.discountAmount,
      input.taxRate,
    )

    const { data, error } = await client
      .from("invoice_lines")
      .update({
        product_id: input.productId,
        description: input.description,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        discount_amount: input.discountAmount,
        tax_rate: input.taxRate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        sort_order: input.sortOrder,
      })
      .eq("tenant_id", tenantId)
      .eq("id", lineId)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update invoice line.",
        "INVOICE_LINE_UPDATE_FAILED",
        error,
      )
    }
    return toLine(data as unknown as Record<string, unknown>)
  }

  async removeLine(tenantId: UUID, lineId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("invoice_lines")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", lineId)

    if (error) {
      throw new ApplicationError(
        "Unable to remove invoice line.",
        "INVOICE_LINE_REMOVE_FAILED",
        error,
      )
    }
  }
}
