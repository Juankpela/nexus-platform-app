import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ProductRepository } from "@/modules/crm/application/ports/product-repository"
import {
  PRODUCT_FAMILIES,
  PRODUCT_TYPES,
  type Product,
  type ProductFamily,
  type ProductImportResult,
  type ProductImportRow,
  type ProductInput,
  type ProductListQuery,
  type ProductOption,
  type ProductType,
} from "@/modules/crm/domain/product"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type ProductRow = Database["public"]["Tables"]["products"]["Row"]

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    productType: row.product_type as ProductType,
    productFamily: row.product_family as ProductFamily,
    unitOfMeasure: row.unit_of_measure,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(tenantId: UUID, input: ProductInput) {
  return {
    tenant_id: tenantId,
    sku: input.sku,
    name: input.name,
    description: input.description,
    product_type: input.productType,
    product_family: input.productFamily,
    unit_of_measure: input.unitOfMeasure,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

const VALID_TYPES = new Set<string>(PRODUCT_TYPES)
const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES)

export class SupabaseProductRepository implements ProductRepository {
  async list(
    tenantId: UUID,
    {
      search,
      productType,
      productFamily,
      active,
      page,
      pageSize,
    }: ProductListQuery,
  ): Promise<Paginated<Product>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("products")
      .select("*", { count: "estimated" })
      .eq("tenant_id", tenantId)

    const term = search ? sanitizeSearch(search) : ""
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,sku.ilike.%${term}%`,
      )
    }
    if (productType) query = query.eq("product_type", productType)
    if (productFamily) query = query.eq("product_family", productFamily)
    if (active !== null) query = query.eq("active", active)

    const { data, error, count } = await query.order("name").range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list products.",
        "PRODUCT_LIST_FAILED",
        error,
      )
    }

    return {
      items: data.map(toProduct),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Product | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError(
        "Unable to load product.",
        "PRODUCT_LOAD_FAILED",
        error,
      )
    }
    return data ? toProduct(data) : null
  }

  async create(tenantId: UUID, input: ProductInput): Promise<Product> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("products")
      .insert(toRow(tenantId, input))
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create product.",
        "PRODUCT_CREATE_FAILED",
        error,
      )
    }
    return toProduct(data)
  }

  async update(
    tenantId: UUID,
    id: UUID,
    input: ProductInput,
  ): Promise<Product> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("products")
      .update(toRow(tenantId, input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update product.",
        "PRODUCT_UPDATE_FAILED",
        error,
      )
    }
    return toProduct(data)
  }

  async setActive(
    tenantId: UUID,
    id: UUID,
    active: boolean,
  ): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("products")
      .update({ active })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change product status.",
        "PRODUCT_ACTIVE_FAILED",
        error,
      )
    }
  }

  async listActiveOptions(tenantId: UUID): Promise<ProductOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("products")
      .select("id, name, sku, product_type, product_family")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to list product options.",
        "PRODUCT_OPTIONS_FAILED",
        error,
      )
    }
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      productType: row.product_type as ProductType,
      productFamily: row.product_family as ProductFamily,
    }))
  }

  async importBatch(
    tenantId: UUID,
    rows: ProductImportRow[],
  ): Promise<ProductImportResult> {
    const errors: ProductImportResult["errors"] = []
    const validRows: ReturnType<typeof toRow>[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1

      if (!row.name?.trim()) {
        errors.push({ row: rowNum, message: "Name is required." })
        continue
      }
      if (row.name.trim().length > 200) {
        errors.push({
          row: rowNum,
          message: "Name must be 200 characters or fewer.",
        })
        continue
      }
      if (!row.productType || !VALID_TYPES.has(row.productType)) {
        errors.push({
          row: rowNum,
          message: `Invalid product_type "${row.productType ?? ""}". Valid: ${PRODUCT_TYPES.join(", ")}.`,
        })
        continue
      }
      if (!row.productFamily || !VALID_FAMILIES.has(row.productFamily)) {
        errors.push({
          row: rowNum,
          message: `Invalid product_family "${row.productFamily ?? ""}". Valid: ${PRODUCT_FAMILIES.join(", ")}.`,
        })
        continue
      }

      validRows.push(
        toRow(tenantId, {
          sku: row.sku,
          name: row.name.trim(),
          description: row.description,
          productType: row.productType as ProductType,
          productFamily: row.productFamily as ProductFamily,
          unitOfMeasure: row.unitOfMeasure,
        }),
      )
    }

    if (validRows.length === 0) {
      return { imported: 0, errors }
    }

    const client = await createServerSupabaseClient()
    const { error } = await client.from("products").insert(validRows)

    if (error) {
      throw new ApplicationError(
        "Unable to import products.",
        "PRODUCT_IMPORT_FAILED",
        error,
      )
    }

    return { imported: validRows.length, errors }
  }

  async exportAll(tenantId: UUID): Promise<Product[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name")

    if (error) {
      throw new ApplicationError(
        "Unable to export products.",
        "PRODUCT_EXPORT_FAILED",
        error,
      )
    }
    return data.map(toProduct)
  }
}
