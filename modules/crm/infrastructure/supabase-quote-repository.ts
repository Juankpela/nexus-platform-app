import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { QuoteRepository } from "@/modules/crm/application/ports/quote-repository"
import type { Paginated } from "@/modules/crm/domain/pagination"
import {
  computeLineTotal,
  computeQuoteTotal,
  type OpportunityOption,
  type PriceBookOption,
  type ProductLineOption,
  type Quote,
  type QuoteDetail,
  type QuoteInput,
  type QuoteListItem,
  type QuoteListQuery,
  type QuoteLine,
  type QuoteLineInput,
  type QuoteStatus,
} from "@/modules/crm/domain/quote"
import type { UUID } from "@/types/shared"

// ── Mapping helpers ──────────────────────────────────────────────────────────

function toQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as string,
    quoteNumber: row.quote_number as string,
    version: row.version as number,
    opportunityId: (row.opportunity_id as string | null) ?? null,
    companyId: (row.company_id as string | null) ?? null,
    contactId: (row.contact_id as string | null) ?? null,
    priceBookId: (row.price_book_id as string | null) ?? null,
    status: row.status as QuoteStatus,
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    expirationDate: (row.expiration_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toLine(row: Record<string, unknown>): QuoteLine {
  const product = (row.products as Record<string, unknown> | null) ?? null
  return {
    id: row.id as string,
    quoteId: row.quote_id as string,
    productId: row.product_id as string,
    productName: (product?.name as string | null) ?? "Unknown product",
    productSku: (product?.sku as string | null) ?? null,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discountAmount: Number(row.discount_amount),
    lineTotal: Number(row.line_total),
    notes: (row.notes as string | null) ?? null,
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseQuoteRepository implements QuoteRepository {
  // ── List ───────────────────────────────────────────────────────────────────
  async list(
    tenantId: UUID,
    { search, status, companyId, page, pageSize }: QuoteListQuery,
  ): Promise<Paginated<QuoteListItem>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("quotes")
      .select("*, companies(name)", { count: "exact" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) query = query.ilike("quote_number", `%${term}%`)
    if (status) query = query.eq("status", status)
    if (companyId) query = query.eq("company_id", companyId)

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list quotes.",
        "QUOTE_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map((row) => {
        const co = Array.isArray(row.companies)
          ? row.companies[0]
          : row.companies
        return {
          ...toQuote(row as unknown as Record<string, unknown>),
          companyName: (co?.name as string | null) ?? null,
        }
      }),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────
  async getById(tenantId: UUID, id: UUID): Promise<QuoteDetail | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("quotes")
      .select(
        "*, companies(name), contacts(first_name, last_name), opportunities(name), price_books(name)",
      )
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load quote.",
        "QUOTE_LOAD_FAILED",
        error,
      )
    }
    if (!data) return null

    const co = Array.isArray(data.companies)
      ? data.companies[0]
      : data.companies
    const ct = Array.isArray(data.contacts)
      ? data.contacts[0]
      : data.contacts
    const op = Array.isArray(data.opportunities)
      ? data.opportunities[0]
      : data.opportunities
    const pb = Array.isArray(data.price_books)
      ? data.price_books[0]
      : data.price_books

    const contactName = ct
      ? [ct.first_name, ct.last_name].filter(Boolean).join(" ") || null
      : null

    return {
      ...toQuote(data as unknown as Record<string, unknown>),
      companyName: (co?.name as string | null) ?? null,
      contactName,
      opportunityName: (op?.name as string | null) ?? null,
      priceBookName: (pb?.name as string | null) ?? null,
    }
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(tenantId: UUID, input: QuoteInput): Promise<Quote> {
    const client = await createServerSupabaseClient()

    // Atomically generate quote number.
    // Cast to any because next_quote_number is not in generated types yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quoteNumber, error: seqError } = await (client.rpc as any)(
      "next_quote_number",
      { p_tenant_id: tenantId },
    )
    if (seqError || !quoteNumber) {
      throw new ApplicationError(
        "Unable to generate quote number.",
        "QUOTE_NUMBER_FAILED",
        seqError,
      )
    }

    const { data, error } = await client
      .from("quotes")
      .insert({
        tenant_id: tenantId,
        quote_number: quoteNumber as string,
        version: 1,
        opportunity_id: input.opportunityId,
        company_id: input.companyId,
        contact_id: input.contactId,
        price_book_id: input.priceBookId,
        discount_amount: input.discountAmount,
        tax_amount: input.taxAmount,
        expiration_date: input.expirationDate,
        notes: input.notes,
        status: "draft",
        subtotal: 0,
        total_amount: computeQuoteTotal(0, input.discountAmount, input.taxAmount),
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create quote.",
        "QUOTE_CREATE_FAILED",
        error,
      )
    }
    return toQuote(data as unknown as Record<string, unknown>)
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(tenantId: UUID, id: UUID, input: QuoteInput): Promise<Quote> {
    const client = await createServerSupabaseClient()

    // Fetch current subtotal so we can recalculate total
    const { data: current } = await client
      .from("quotes")
      .select("subtotal")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .single()

    const subtotal = Number(current?.subtotal ?? 0)
    const totalAmount = computeQuoteTotal(
      subtotal,
      input.discountAmount,
      input.taxAmount,
    )

    const { data, error } = await client
      .from("quotes")
      .update({
        opportunity_id: input.opportunityId,
        company_id: input.companyId,
        contact_id: input.contactId,
        price_book_id: input.priceBookId,
        discount_amount: input.discountAmount,
        tax_amount: input.taxAmount,
        total_amount: totalAmount,
        expiration_date: input.expirationDate,
        notes: input.notes,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update quote.",
        "QUOTE_UPDATE_FAILED",
        error,
      )
    }
    return toQuote(data as unknown as Record<string, unknown>)
  }

  // ── Set status ─────────────────────────────────────────────────────────────
  async setStatus(
    tenantId: UUID,
    id: UUID,
    status: QuoteStatus,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("quotes")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to update quote status.",
        "QUOTE_STATUS_FAILED",
        error,
      )
    }
  }

  // ── Create revision ────────────────────────────────────────────────────────
  async createRevision(tenantId: UUID, sourceId: UUID): Promise<Quote> {
    const client = await createServerSupabaseClient()

    // Fetch source quote
    const { data: source, error: sourceError } = await client
      .from("quotes")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", sourceId)
      .single()

    if (sourceError || !source) {
      throw new ApplicationError("Quote not found.", "QUOTE_NOT_FOUND")
    }

    // Get highest version for this quote_number
    const { data: maxRow } = await client
      .from("quotes")
      .select("version")
      .eq("tenant_id", tenantId)
      .eq("quote_number", source.quote_number)
      .order("version", { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (maxRow?.version ?? source.version) + 1

    // Insert new revision (draft, carry over quote fields)
    const { data: newQuote, error: insertError } = await client
      .from("quotes")
      .insert({
        tenant_id: tenantId,
        quote_number: source.quote_number,
        version: nextVersion,
        status: "draft",
        opportunity_id: source.opportunity_id,
        company_id: source.company_id,
        contact_id: source.contact_id,
        price_book_id: source.price_book_id,
        discount_amount: source.discount_amount,
        tax_amount: source.tax_amount,
        expiration_date: source.expiration_date,
        notes: source.notes,
        subtotal: 0,
        total_amount: 0,
      })
      .select("*")
      .single()

    if (insertError || !newQuote) {
      throw new ApplicationError(
        "Unable to create quote revision.",
        "QUOTE_REVISION_FAILED",
        insertError,
      )
    }

    // Clone source lines
    const { data: sourceLines } = await client
      .from("quote_lines")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("quote_id", sourceId)

    if (sourceLines && sourceLines.length > 0) {
      await client.from("quote_lines").insert(
        sourceLines.map((l) => ({
          tenant_id: tenantId,
          quote_id: newQuote.id,
          product_id: l.product_id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_amount: l.discount_amount,
          line_total: l.line_total,
          notes: l.notes,
          sort_order: l.sort_order,
        })),
      )
      await this.recalculateTotals(tenantId, newQuote.id)
    }

    return toQuote(newQuote as unknown as Record<string, unknown>)
  }

  // ── Recalculate totals ─────────────────────────────────────────────────────
  async recalculateTotals(tenantId: UUID, quoteId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()

    // Sum all line totals
    const { data: linesData } = await client
      .from("quote_lines")
      .select("line_total")
      .eq("tenant_id", tenantId)
      .eq("quote_id", quoteId)

    const subtotal = (linesData ?? []).reduce(
      (sum, l) => sum + Number(l.line_total),
      0,
    )

    // Fetch current discount/tax
    const { data: quoteData } = await client
      .from("quotes")
      .select("discount_amount, tax_amount")
      .eq("tenant_id", tenantId)
      .eq("id", quoteId)
      .single()

    const discountAmount = Number(quoteData?.discount_amount ?? 0)
    const taxAmount = Number(quoteData?.tax_amount ?? 0)
    const totalAmount = computeQuoteTotal(subtotal, discountAmount, taxAmount)

    await client
      .from("quotes")
      .update({ subtotal, total_amount: totalAmount })
      .eq("tenant_id", tenantId)
      .eq("id", quoteId)
  }

  // ── Lines ──────────────────────────────────────────────────────────────────
  async listLines(tenantId: UUID, quoteId: UUID): Promise<QuoteLine[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("quote_lines")
      .select("*, products(name, sku)")
      .eq("tenant_id", tenantId)
      .eq("quote_id", quoteId)
      .order("sort_order")
      .order("created_at")

    if (error) {
      throw new ApplicationError(
        "Unable to load quote lines.",
        "QUOTE_LINES_FAILED",
        error,
      )
    }
    return data.map((row) => toLine(row as unknown as Record<string, unknown>))
  }

  async addLine(
    tenantId: UUID,
    quoteId: UUID,
    input: QuoteLineInput & { lineTotal?: number },
  ): Promise<QuoteLine> {
    const client = await createServerSupabaseClient()
    const lineTotal =
      input.lineTotal ??
      computeLineTotal(input.quantity, input.unitPrice, input.discountAmount)

    const { data, error } = await client
      .from("quote_lines")
      .insert({
        tenant_id: tenantId,
        quote_id: quoteId,
        product_id: input.productId,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        discount_amount: input.discountAmount,
        line_total: lineTotal,
        notes: input.notes,
        sort_order: input.sortOrder,
      })
      .select("*, products(name, sku)")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to add quote line.",
        "QUOTE_LINE_ADD_FAILED",
        error,
      )
    }
    return toLine(data as unknown as Record<string, unknown>)
  }

  async updateLine(
    tenantId: UUID,
    lineId: UUID,
    input: QuoteLineInput & { lineTotal?: number },
  ): Promise<QuoteLine> {
    const client = await createServerSupabaseClient()
    const lineTotal =
      input.lineTotal ??
      computeLineTotal(input.quantity, input.unitPrice, input.discountAmount)

    const { data, error } = await client
      .from("quote_lines")
      .update({
        product_id: input.productId,
        quantity: input.quantity,
        unit_price: input.unitPrice,
        discount_amount: input.discountAmount,
        line_total: lineTotal,
        notes: input.notes,
        sort_order: input.sortOrder,
      })
      .eq("tenant_id", tenantId)
      .eq("id", lineId)
      .select("*, products(name, sku)")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update quote line.",
        "QUOTE_LINE_UPDATE_FAILED",
        error,
      )
    }
    return toLine(data as unknown as Record<string, unknown>)
  }

  async removeLine(tenantId: UUID, lineId: UUID): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("quote_lines")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", lineId)

    if (error) {
      throw new ApplicationError(
        "Unable to remove quote line.",
        "QUOTE_LINE_REMOVE_FAILED",
        error,
      )
    }
  }

  // ── Option lists ───────────────────────────────────────────────────────────
  async listOpportunityOptions(tenantId: UUID): Promise<OpportunityOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("opportunities")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to load opportunity options.",
        "OPPORTUNITY_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((r) => ({ id: r.id, name: r.name }))
  }

  async listPriceBookOptions(tenantId: UUID): Promise<PriceBookOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_books")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to load price book options.",
        "PRICE_BOOK_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((r) => ({ id: r.id, name: r.name }))
  }

  async listProductLineOptions(
    tenantId: UUID,
    priceBookId: UUID | null,
  ): Promise<ProductLineOption[]> {
    const client = await createServerSupabaseClient()

    if (priceBookId) {
      // Products from the selected price book with their prices
      const { data, error } = await client
        .from("price_book_entries")
        .select("product_id, unit_price, products(id, name, sku)")
        .eq("tenant_id", tenantId)
        .eq("price_book_id", priceBookId)
        .eq("active", true)

      if (error) {
        throw new ApplicationError(
          "Unable to load product line options.",
          "PRODUCT_LINE_OPTIONS_FAILED",
          error,
        )
      }

      // If the price book has entries, use them (with their prices).
      if (data.length > 0) {
        return data.map((r) => {
          const p = Array.isArray(r.products) ? r.products[0] : r.products
          return {
            id: (p?.id as string) ?? r.product_id,
            name: (p?.name as string) ?? "Unknown product",
            sku: (p?.sku as string | null) ?? null,
            defaultUnitPrice: Number(r.unit_price),
          }
        })
      }
      // Empty price book → fall back to all active products (manual pricing)
      // so the user can still add lines.
    }

    // All active products, no default price
    const { data, error } = await client
      .from("products")
      .select("id, name, sku")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to load product line options.",
        "PRODUCT_LINE_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      defaultUnitPrice: null,
    }))
  }
}
