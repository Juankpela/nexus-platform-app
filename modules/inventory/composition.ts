import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import type { StockMovementDeps } from "@/modules/inventory/application/use-cases/apply-stock-movement"
import type {
  MaterialQuery,
  TransactionQuery,
} from "@/modules/inventory/application/ports/inventory-repository"
import {
  getInventory,
  getInventoryOverview,
  listMaterials,
  listTransactions,
  searchMaterials,
} from "@/modules/inventory/application/use-cases/read-inventory"
import {
  adjustStock,
  consumeMaterial,
  receiveStock,
  releaseReservation,
  reserveMaterial,
  type StockOpInput,
} from "@/modules/inventory/application/use-cases/stock-operations"
import { SupabaseInventoryRepository } from "@/modules/inventory/infrastructure/supabase-inventory-repository"
import { listMaterialsKeyset } from "@/modules/inventory/infrastructure/supabase-material-api-reader"
import type { UUID } from "@/types/shared"

function inventoryRepo() {
  return new SupabaseInventoryRepository()
}

function deps(): StockMovementDeps {
  return { inventory: inventoryRepo(), audit: new SupabaseAuditRepository() }
}

export function receiveStockMovement(input: StockOpInput) {
  return receiveStock(deps(), input)
}

export function adjustStockMovement(input: StockOpInput) {
  return adjustStock(deps(), input)
}

export function reserveMaterialMovement(input: StockOpInput) {
  return reserveMaterial(deps(), input)
}

export function releaseReservationMovement(input: StockOpInput) {
  return releaseReservation(deps(), input)
}

export function consumeMaterialMovement(
  input: StockOpInput & { fulfillReservation?: boolean },
) {
  return consumeMaterial(deps(), input)
}

export function listInventoryMaterials(
  tenantId: UUID,
  options?: { activeOnly?: boolean },
) {
  return listMaterials({ inventory: inventoryRepo() }, tenantId, options)
}

export function getInventorySnapshot(tenantId: UUID, materialId: UUID) {
  return getInventory({ inventory: inventoryRepo() }, tenantId, materialId)
}

export function searchInventoryMaterials(tenantId: UUID, query: MaterialQuery) {
  return searchMaterials({ inventory: inventoryRepo() }, tenantId, query)
}

export function listInventoryTransactions(tenantId: UUID, query: TransactionQuery) {
  return listTransactions({ inventory: inventoryRepo() }, tenantId, query)
}

export function getInventoryOverviewStats(tenantId: UUID) {
  return getInventoryOverview({ inventory: inventoryRepo() }, tenantId)
}

// Public API read path (INT-2): service-role + tenant filter, keyset by id.
export function listMaterialsApiPage(
  tenantId: UUID,
  params: { afterId: string | null; limit: number; active: boolean | null },
) {
  return listMaterialsKeyset(tenantId, params)
}
