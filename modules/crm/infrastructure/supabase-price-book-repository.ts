import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { PriceBookRepository } from "@/modules/crm/application/ports/price-book-repository"
import type {
  PriceBook,
  PriceBookEntry,
  PriceBookEntryInput,
  PriceBookInput,
  ProductPriceAssignment,
} from "@/modules/crm/domain/price-book"
import type { ProductFamily, ProductType } from "@/modules/crm/domain/product"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type PriceBookRow = Database["public"]["Tables"]["price_books"]["Row"]

function toPriceBook(row: PriceBookRow): PriceBook {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabasePriceBookRepository implements PriceBookRepository {
  async list(
    tenantId: UUID,
    { search, page, pageSize }: ListQuery,
  ): Promise<Paginated<PriceBook>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("price_books")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) query = query.ilike("name", `%${term}%`)

    const { data, error, count } = await query.order("name").range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list price books.",
        "PRICE_BOOK_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map(toPriceBook),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<PriceBook | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_books")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load price book.",
        "PRICE_BOOK_LOAD_FAILED",
        error,
      )
    }
    return data ? toPriceBook(data) : null
  }

  async create(tenantId: UUID, input: PriceBookInput): Promise<PriceBook> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_books")
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description,
        active: input.active,
      })
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create price book.",
        "PRICE_BOOK_CREATE_FAILED",
        error,
      )
    }
    return toPriceBook(data)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: PriceBookInput,
  ): Promise<PriceBook> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_books")
      .update({
        name: input.name,
        description: input.description,
        active: input.active,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update price book.",
        "PRICE_BOOK_UPDATE_FAILED",
        error,
      )
    }
    return toPriceBook(data)
  }

  async setActive(tenantId: UUID, id: UUID, active: boolean): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("price_books")
      .update({ active })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change price book status.",
        "PRICE_BOOK_ACTIVE_FAILED",
        error,
      )
    }
  }

  async listEntries(
    tenantId: UUID,
    priceBookId: UUID,
  ): Promise<PriceBookEntry[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_book_entries")
      .select("*, products(name, sku, product_type, product_family)")
      .eq("tenant_id", tenantId)
      .eq("price_book_id", priceBookId)
      .eq("active", true)
      .order("created_at", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to list price book entries.",
        "PRICE_BOOK_ENTRIES_FAILED",
        error,
      )
    }

    return data.map((row) => {
      const product = Array.isArray(row.products)
        ? row.products[0]
        : row.products
      return {
        id: row.id,
        priceBookId: row.price_book_id,
        productId: row.product_id,
        productName: product?.name ?? "Unknown product",
        productSku: product?.sku ?? null,
        productType: (product?.product_type ?? "physical_product") as ProductType,
        productFamily: (product?.product_family ?? "consumables") as ProductFamily,
        unitPrice: Number(row.unit_price),
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    })
  }

  async listEntriesForProduct(
    tenantId: UUID,
    productId: UUID,
  ): Promise<ProductPriceAssignment[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("price_book_entries")
      .select("id, price_book_id, unit_price, active, price_books(name)")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("active", true)
      .order("created_at", { ascending: false })

    if (error) {
      throw new ApplicationError(
        "Unable to load product price assignments.",
        "PRICE_ASSIGNMENTS_FAILED",
        error,
      )
    }

    return data.map((row) => {
      const pb = Array.isArray(row.price_books)
        ? row.price_books[0]
        : row.price_books
      return {
        entryId: row.id,
        priceBookId: row.price_book_id,
        priceBookName: pb?.name ?? "Unknown",
        unitPrice: Number(row.unit_price),
        active: row.active,
      }
    })
  }

  async upsertEntry(
    tenantId: UUID,
    priceBookId: UUID,
    input: PriceBookEntryInput,
  ): Promise<{ isNew: boolean }> {
    const client = await createServerSupabaseClient()

    // Check if entry already exists (to distinguish create vs update)
    const { data: existing } = await client
      .from("price_book_entries")
      .select("id")
      .eq("price_book_id", priceBookId)
      .eq("product_id", input.productId)
      .maybeSingle()

    const { error } = await client.from("price_book_entries").upsert(
      {
        tenant_id: tenantId,
        price_book_id: priceBookId,
        product_id: input.productId,
        unit_price: input.unitPrice,
        active: input.active,
      },
      { onConflict: "price_book_id,product_id" },
    )

    if (error) {
      throw new ApplicationError(
        "Unable to save price book entry.",
        "PRICE_BOOK_ENTRY_UPSERT_FAILED",
        error,
      )
    }

    return { isNew: !existing }
  }

  async deactivateEntry(
    tenantId: UUID,
    priceBookId: UUID,
    productId: UUID,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("price_book_entries")
      .update({ active: false })
      .eq("tenant_id", tenantId)
      .eq("price_book_id", priceBookId)
      .eq("product_id", productId)

    if (error) {
      throw new ApplicationError(
        "Unable to deactivate price book entry.",
        "PRICE_BOOK_ENTRY_DEACTIVATE_FAILED",
        error,
      )
    }
  }
}
