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
}
