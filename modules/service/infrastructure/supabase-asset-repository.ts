import "server-only"

import type { ImportResult } from "@/lib/csv/import-result"
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
import {
  assetCompanyKey,
  assetDedupKey,
  hasCompanyReference,
  resolveAssetCategory,
  resolveAssetCriticality,
  resolveAssetType,
  type AssetImportRow,
} from "@/modules/service/domain/asset-import"
import type { Database } from "@/types/database"
import type { UUID } from "@/types/shared"

/** Max rows per insert call — keeps a single failing row from sinking the file. */
const IMPORT_CHUNK_SIZE = 500

type AssetRow = Database["public"]["Tables"]["assets"]["Row"]
type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"]
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

  async importBatch(
    tenantId: UUID,
    params: { createdBy: UUID; rows: AssetImportRow[] },
  ): Promise<ImportResult> {
    const { createdBy, rows } = params
    const errors: ImportResult["errors"] = []
    let skipped = 0
    const client = await createServerSupabaseClient()

    // Index existing companies by BOTH tax and name keys so a row referencing
    // either resolves (first match wins on collisions).
    const { data: companies, error: companiesError } = await client
      .from("companies")
      .select("id, name, tax_id")
      .eq("tenant_id", tenantId)
    if (companiesError) {
      throw new ApplicationError(
        "Unable to read companies for asset import.",
        "ASSET_IMPORT_COMPANY_READ_FAILED",
        companiesError,
      )
    }
    const companyIndex = new Map<string, UUID>()
    for (const c of companies ?? []) {
      const tax = c.tax_id?.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (tax && !companyIndex.has(`tax:${tax}`)) companyIndex.set(`tax:${tax}`, c.id)
      const name = c.name?.trim().toLowerCase().replace(/\s+/g, " ")
      if (name && !companyIndex.has(`name:${name}`)) companyIndex.set(`name:${name}`, c.id)
    }

    // Seed dedup from existing serial numbers (the strong key).
    const { data: existing, error: assetsError } = await client
      .from("assets")
      .select("serial_number")
      .eq("tenant_id", tenantId)
      .not("serial_number", "is", null)
    if (assetsError) {
      throw new ApplicationError(
        "Unable to read assets for import.",
        "ASSET_IMPORT_READ_FAILED",
        assetsError,
      )
    }
    const seen = new Set<string>()
    for (const a of existing ?? []) {
      if (a.serial_number) seen.add(`serial:${a.serial_number.trim().toLowerCase()}`)
    }

    type Pending = { row: number; build: (assetNumber: string) => AssetInsert }
    const pending: Pending[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      const name = row.name?.trim()
      if (!name) {
        errors.push({ row: rowNum, message: "El nombre del activo es obligatorio." })
        continue
      }
      const assetType = resolveAssetType(row.assetType)
      if (!assetType) {
        errors.push({ row: rowNum, message: `Tipo inválido: "${row.assetType}".` })
        continue
      }
      const assetCategory = resolveAssetCategory(row.assetCategory)
      if (!assetCategory) {
        errors.push({ row: rowNum, message: `Categoría inválida: "${row.assetCategory}".` })
        continue
      }
      const criticality = resolveAssetCriticality(row.criticality)
      if (!criticality) {
        errors.push({ row: rowNum, message: `Criticidad inválida: "${row.criticality}".` })
        continue
      }

      let companyId: UUID | null = null
      let companyKey: string | null = null
      if (hasCompanyReference(row)) {
        companyKey = assetCompanyKey(row)
        const resolved = companyKey ? companyIndex.get(companyKey) : undefined
        if (!resolved) {
          errors.push({
            row: rowNum,
            message: `Empresa no encontrada: "${row.companyTaxId ?? row.companyName}". Impórtala primero o corrige el dato.`,
          })
          continue
        }
        companyId = resolved
      }

      const key = assetDedupKey({ name, serialNumber: row.serialNumber, companyKey })
      if (key && seen.has(key)) {
        skipped += 1
        continue
      }
      if (key) seen.add(key)

      pending.push({
        row: rowNum,
        build: (assetNumber) => ({
          tenant_id: tenantId,
          created_by: createdBy,
          asset_number: assetNumber,
          name,
          asset_type: assetType,
          asset_category: assetCategory,
          criticality,
          serial_number: row.serialNumber,
          manufacturer: row.manufacturer,
          model: row.model,
          location: row.location,
          company_id: companyId,
          notes: row.notes,
        }),
      })
    }

    // Generate one asset number per valid row (atomic sequence via RPC).
    const records: { row: number; record: AssetInsert }[] = []
    for (const p of pending) {
      const { data: num, error: numError } = await client.rpc("next_asset_number", {
        p_tenant_id: tenantId,
      })
      if (numError || !num) {
        errors.push({ row: p.row, message: "No se pudo generar el número de activo." })
        continue
      }
      records.push({ row: p.row, record: p.build(num as string) })
    }

    let imported = 0
    for (let i = 0; i < records.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = records.slice(i, i + IMPORT_CHUNK_SIZE)
      const { error } = await client.from("assets").insert(chunk.map((c) => c.record))
      if (error) {
        for (const c of chunk) {
          errors.push({ row: c.row, message: "No se pudo guardar esta fila." })
        }
      } else {
        imported += chunk.length
      }
    }

    return { imported, skipped, errors }
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
