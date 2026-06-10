import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type {
  ApplyStockMovementParams,
  InventoryRepository,
  StockMovementResult,
} from "@/modules/inventory/application/ports/inventory-repository"
import type { InventoryItem } from "@/modules/inventory/domain/inventory-item"
import type { InventoryTransaction } from "@/modules/inventory/domain/inventory-transaction"
import type { Material } from "@/modules/inventory/domain/material"
import type { Database, Json } from "@/types/database"
import type { UUID } from "@/types/shared"

type MaterialRow = Database["public"]["Tables"]["materials"]["Row"]
type ItemRow = Database["public"]["Tables"]["inventory_items"]["Row"]
type TxRow = Database["public"]["Tables"]["inventory_transactions"]["Row"]

/** Stable error tokens the RPCs RAISE — mapped 1:1 to ApplicationError codes. */
const RPC_ERROR_CODES = new Set([
  "FORBIDDEN",
  "MATERIAL_NOT_FOUND",
  "MATERIAL_INACTIVE",
  "INSUFFICIENT_STOCK",
  "INSUFFICIENT_RESERVED",
  "INSUFFICIENT_AVAILABLE",
])

function toMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unitOfMeasure: row.unit_of_measure,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toItem(row: ItemRow): InventoryItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    materialId: row.material_id,
    quantityOnHand: row.quantity_on_hand,
    quantityReserved: row.quantity_reserved,
    quantityAvailable: row.quantity_available,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toTransaction(row: TxRow): InventoryTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    materialId: row.material_id,
    type: row.type,
    quantity: row.quantity,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

/** Translate a PostgREST/RPC error into an ApplicationError (never returns). */
function failFromRpc(error: { message: string; code?: string }): never {
  const token = error.message?.trim()
  const code = token && RPC_ERROR_CODES.has(token) ? token : "INVENTORY_RPC_FAILED"
  throw new ApplicationError(
    `Inventory operation failed: ${error.message}`,
    code,
    error,
  )
}

export class SupabaseInventoryRepository implements InventoryRepository {
  async getMaterial(tenantId: UUID, materialId: UUID): Promise<Material | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("materials")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", materialId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load material.", "MATERIAL_LOAD_FAILED", error)
    }
    return data ? toMaterial(data) : null
  }

  async listMaterials(
    tenantId: UUID,
    options?: { activeOnly?: boolean },
  ): Promise<Material[]> {
    const client = await createServerSupabaseClient()
    let query = client
      .from("materials")
      .select("*", { count: "estimated" })
      .eq("tenant_id", tenantId)
    if (options?.activeOnly) query = query.eq("active", true)

    const { data, error } = await query.order("name", { ascending: true })
    if (error) {
      throw new ApplicationError("Unable to list materials.", "MATERIALS_LIST_FAILED", error)
    }
    return (data ?? []).map(toMaterial)
  }

  async getInventoryItem(
    tenantId: UUID,
    materialId: UUID,
  ): Promise<InventoryItem | null> {
    const client = await createServerSupabaseClient()
    const { data, error } = await client
      .from("inventory_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("material_id", materialId)
      .maybeSingle()

    if (error) {
      throw new ApplicationError("Unable to load inventory item.", "INVENTORY_ITEM_LOAD_FAILED", error)
    }
    return data ? toItem(data) : null
  }

  async applyStockMovement(
    params: ApplyStockMovementParams,
  ): Promise<StockMovementResult> {
    const client = await createServerSupabaseClient()
    const base = {
      p_tenant_id: params.tenantId,
      p_material_id: params.materialId,
      p_quantity: params.quantity,
      p_reference_type: params.referenceType,
      p_reference_id: params.referenceId,
    }

    let data: Json | null
    let error: { message: string; code?: string } | null

    switch (params.type) {
      case "receipt":
        ({ data, error } = await client.rpc("inventory_receive", base))
        break
      case "consumption":
        ({ data, error } = await client.rpc("inventory_consume", {
          ...base,
          p_fulfill_reservation: params.fulfillReservation,
        }))
        break
      case "adjustment":
        ({ data, error } = await client.rpc("inventory_adjust", base))
        break
      case "reservation":
        ({ data, error } = await client.rpc("inventory_reserve", base))
        break
      case "release":
        ({ data, error } = await client.rpc("inventory_release", base))
        break
      default: {
        const exhaustive: never = params.type
        throw new ApplicationError(
          `Unknown movement type: ${String(exhaustive)}`,
          "INVENTORY_RPC_FAILED",
        )
      }
    }

    if (error) failFromRpc(error)
    if (!data) {
      throw new ApplicationError("Inventory RPC returned no data.", "INVENTORY_RPC_FAILED")
    }

    const payload = data as unknown as { item: ItemRow; transaction: TxRow }
    return {
      item: toItem(payload.item),
      transaction: toTransaction(payload.transaction),
    }
  }
}
