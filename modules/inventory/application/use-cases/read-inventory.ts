import { ApplicationError } from "@/lib/errors/application-error"
import type {
  InventoryOverview,
  InventoryRepository,
  InventoryTransactionView,
  MaterialQuery,
  Paged,
  TransactionQuery,
} from "@/modules/inventory/application/ports/inventory-repository"
import type { InventoryItem } from "@/modules/inventory/domain/inventory-item"
import type { Material } from "@/modules/inventory/domain/material"
import type { UUID } from "@/types/shared"

export type ReadInventoryDeps = { inventory: InventoryRepository }

export function listMaterials(
  { inventory }: ReadInventoryDeps,
  tenantId: UUID,
  options?: { activeOnly?: boolean },
): Promise<Material[]> {
  return inventory.listMaterials(tenantId, options)
}

/** Material + its (optional) stock snapshot. Throws if the material is unknown. */
export type InventorySnapshot = {
  material: Material
  item: InventoryItem | null
}

export async function getInventory(
  { inventory }: ReadInventoryDeps,
  tenantId: UUID,
  materialId: UUID,
): Promise<InventorySnapshot> {
  const material = await inventory.getMaterial(tenantId, materialId)
  if (!material) {
    throw new ApplicationError("Material not found.", "MATERIAL_NOT_FOUND")
  }
  const item = await inventory.getInventoryItem(tenantId, materialId)
  return { material, item }
}

// ── E-1 read-only queries (expose existing data; no business logic) ──────────

export function searchMaterials(
  { inventory }: ReadInventoryDeps,
  tenantId: UUID,
  query: MaterialQuery,
): Promise<Paged<Material>> {
  return inventory.searchMaterials(tenantId, query)
}

export function listTransactions(
  { inventory }: ReadInventoryDeps,
  tenantId: UUID,
  query: TransactionQuery,
): Promise<Paged<InventoryTransactionView>> {
  return inventory.listTransactions(tenantId, query)
}

export function getInventoryOverview(
  { inventory }: ReadInventoryDeps,
  tenantId: UUID,
): Promise<InventoryOverview> {
  return inventory.getOverview(tenantId)
}
