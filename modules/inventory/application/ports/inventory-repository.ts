import type { InventoryItem } from "@/modules/inventory/domain/inventory-item"
import type {
  InventoryTransaction,
  ReferenceType,
  TransactionType,
} from "@/modules/inventory/domain/inventory-transaction"
import type { Material } from "@/modules/inventory/domain/material"
import type { UUID } from "@/types/shared"

/** The atomic outcome of a stock movement: the updated snapshot + ledger entry. */
export type StockMovementResult = {
  item: InventoryItem
  transaction: InventoryTransaction
}

/**
 * Intent passed to the infrastructure. The Sprint D implementation applies this
 * atomically (ledger insert + snapshot update under a row lock) via a
 * SECURITY DEFINER RPC — it is the authoritative computation. The application
 * layer pre-validates with the domain to fail fast and build the audit metadata.
 */
export type ApplyStockMovementParams = {
  tenantId: UUID
  materialId: UUID
  type: TransactionType
  quantity: number
  referenceType: ReferenceType
  referenceId: UUID | null
  fulfillReservation: boolean
  createdBy: UUID
}

// ── Read-only query DTOs (E-1 exposure layer; no business logic) ─────────────
export type Paged<T> = { items: T[]; total: number }

export type MaterialQuery = {
  search?: string | null
  sku?: string | null
  active?: boolean | null
  limit: number
  offset: number
}

export type TransactionQuery = {
  materialId?: UUID | null
  type?: TransactionType | null
  limit: number
  offset: number
}

/** A ledger row enriched with its material's display fields, for read views. */
export type InventoryTransactionView = InventoryTransaction & {
  materialName: string | null
  materialSku: string | null
}

export type InventoryOverview = {
  totalMaterials: number
  totalItems: number
  lowStockCount: number
  recentMovements: InventoryTransactionView[]
}

export interface InventoryRepository {
  getMaterial(tenantId: UUID, materialId: UUID): Promise<Material | null>
  listMaterials(
    tenantId: UUID,
    options?: { activeOnly?: boolean },
  ): Promise<Material[]>
  getInventoryItem(
    tenantId: UUID,
    materialId: UUID,
  ): Promise<InventoryItem | null>
  applyStockMovement(
    params: ApplyStockMovementParams,
  ): Promise<StockMovementResult>

  // ── Read-only (E-1) ──
  searchMaterials(tenantId: UUID, query: MaterialQuery): Promise<Paged<Material>>
  listTransactions(
    tenantId: UUID,
    query: TransactionQuery,
  ): Promise<Paged<InventoryTransactionView>>
  getOverview(tenantId: UUID): Promise<InventoryOverview>
}
