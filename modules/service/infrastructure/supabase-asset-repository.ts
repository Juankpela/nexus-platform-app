import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Paginated } from "@/modules/crm/domain/pagination"
import type { AssetRepository } from "@/modules/service/application/ports/asset-repository"
import type {
  Asset,
  AssetFilters,
  AssetInput,
  AssetOption,
  AssetStatus,
} from "@/modules/service/domain/asset"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

type AssetRow = Database["public"]["Tables"]["assets"]["Row"]
type AssetRowWithRefs = AssetRow & {
  products: { name: string } | null
  companies: { name: string } | null
}

const SELECT_WITH_REFS = "*, products(name), companies(name)"

function toAsset(row: AssetRowWithRefs, parentAssetName: string | null = null): Asset {
  return {
    id: row.id,
    assetNumber: row.asset_number,
    name: row.name,
    assetType: row.asset_type,
    assetCategory: row.asset_category,
    status: row.status,
    criticality: row.criticality,
    healthScore: row.health_score,
    productId: row.product_id,
    productName: row.products?.name ?? null,
    companyId: row.company_id,
    companyName: row.companies?.name ?? null,
    parentAssetId: row.parent_asset_id,
    parentAssetName,
    serialNumber: row.serial_number,
    manufacturer: row.manufacturer,
    model: row.model,
    location: row.location,
    installedAt: row.installed_at,
    warrantyUntil: row.warranty_until,
    lastServiceAt: row.last_service_at,
    nextServiceDueAt: row.next_service_due_at,
    purchaseCost: row.purchase_cost,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRow(input: AssetInput) {
  return {
    name: input.name,
    asset_type: input.assetType,
    asset_category: input.assetCategory,
    criticality: input.criticality,
    health_score: input.healthScore,
    product_id: input.productId,
    company_id: input.companyId,
    parent_asset_id: input.parentAssetId,
    serial_number: input.serialNumber,
    manufacturer: input.manufacturer,
    model: input.model,
    location: input.location,
    installed_at: input.installedAt,
    warranty_until: input.warrantyUntil,
    next_service_due_at: input.nextServiceDueAt,
    purchase_cost: input.purchaseCost,
    notes: input.notes,
  }
}

function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim()
}

export class SupabaseAssetRepository implements AssetRepository {
  async list(
    tenantId: UUID,
    filters: AssetFilters,
    page: number,
    pageSize: number,
  ): Promise<Paginated<Asset>> {
    const client = await createServerSupabaseClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from("assets")
      .select(SELECT_WITH_REFS, { count: "estimated" })
      .eq("tenant_id", tenantId)

    if (filters.status) query = query.eq("status", filters.status)
    if (filters.category) query = query.eq("asset_category", filters.category)
    if (filters.criticality) query = query.eq("criticality", filters.criticality)
    if (filters.companyId) query = query.eq("company_id", filters.companyId)
    const term = filters.search ? sanitizeSearch(filters.search) : ""
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,asset_number.ilike.%${term}%,serial_number.ilike.%${term}%`,
      )
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new ApplicationError(
        "Unable to list assets.",
        "ASSET_LIST_FAILED",
        error,
      )
    }

    return {
      items: (data as unknown as AssetRowWithRefs[]).map((r) => toAsset(r)),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getById(tenantId: UUID, id: UUID): Promise<Asset | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("assets")
      .select(SELECT_WITH_REFS)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load asset.", "ASSET_LOAD_FAILED", error)
    }
    if (!data) return null

    const row = data as unknown as AssetRowWithRefs
    let parentAssetName: string | null = null
    if (row.parent_asset_id) {
      const { data: parent } = await client
        .from("assets")
        .select("name")
        .eq("tenant_id", tenantId)
        .eq("id", row.parent_asset_id)
        .maybeSingle()
      parentAssetName = parent?.name ?? null
    }
    return toAsset(row, parentAssetName)
  }

  async listOptions(tenantId: UUID): Promise<AssetOption[]> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("assets")
      .select("id, asset_number, name")
      .eq("tenant_id", tenantId)
      .neq("status", "retired")
      .order("asset_number", { ascending: true })

    if (error) {
      throw new ApplicationError(
        "Unable to list asset options.",
        "ASSET_OPTIONS_FAILED",
        error,
      )
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      assetNumber: r.asset_number,
      name: r.name,
    }))
  }

  async create(
    tenantId: UUID,
    params: { createdBy: UUID; assetNumber: string; input: AssetInput },
  ): Promise<Asset> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("assets")
      .insert({
        tenant_id: tenantId,
        created_by: params.createdBy,
        asset_number: params.assetNumber,
        ...toRow(params.input),
      })
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to create asset.",
        "ASSET_CREATE_FAILED",
        error,
      )
    }
    return toAsset(data as unknown as AssetRowWithRefs)
  }

  async update(tenantId: UUID, id: UUID, input: AssetInput): Promise<Asset> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("assets")
      .update(toRow(input))
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select(SELECT_WITH_REFS)
      .single()

    if (error || !data) {
      throw new ApplicationError(
        "Unable to update asset.",
        "ASSET_UPDATE_FAILED",
        error,
      )
    }
    return toAsset(data as unknown as AssetRowWithRefs)
  }

  async setStatus(tenantId: UUID, id: UUID, status: AssetStatus): Promise<void> {
    const client = await createServerSupabaseClient()
    const { error } = await client
      .from("assets")
      .update({ status })
      .eq("tenant_id", tenantId)
      .eq("id", id)

    if (error) {
      throw new ApplicationError(
        "Unable to change asset status.",
        "ASSET_STATUS_FAILED",
        error,
      )
    }
  }

  async nextAssetNumber(tenantId: UUID): Promise<string> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client.rpc("next_asset_number", {
      p_tenant_id: tenantId,
    })

    if (error || !data) {
      throw new ApplicationError(
        "Unable to generate asset number.",
        "ASSET_NUMBER_FAILED",
        error,
      )
    }
    return data as string
  }
}
