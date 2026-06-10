import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type {
  InventoryRepository,
  StockMovementResult,
} from "@/modules/inventory/application/ports/inventory-repository"
import {
  availableOf,
  type StockState,
} from "@/modules/inventory/domain/inventory-item"
import {
  evaluateTransaction,
  type ReferenceType,
  type TransactionError,
  type TransactionType,
} from "@/modules/inventory/domain/inventory-transaction"
import type { UUID } from "@/types/shared"

export type StockMovementDeps = {
  inventory: InventoryRepository
  audit: AuditRepository
}

export type StockMovementInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  materialId: UUID
  type: TransactionType
  quantity: number
  referenceType: ReferenceType
  referenceId: UUID | null
  fulfillReservation?: boolean
}

/** Maps a domain TransactionError to the application-facing error code. */
const ERROR_CODE: Record<TransactionError, string> = {
  INVALID_QUANTITY: "INVALID_QUANTITY",
  INVALID_REFERENCE: "INVALID_REFERENCE",
  INVALID_REFERENCE_FOR_TYPE: "INVALID_REFERENCE_FOR_TYPE",
  ON_HAND_NEGATIVE: "INSUFFICIENT_STOCK",
  RESERVED_NEGATIVE: "INSUFFICIENT_RESERVED",
  RESERVED_EXCEEDS_ON_HAND: "INSUFFICIENT_AVAILABLE",
}

/** Domain event emitted per movement (ADR-023 emission point → audit trail). */
const EVENT_BY_TYPE: Record<TransactionType, string> = {
  receipt: "inventory.stock_received",
  consumption: "inventory.stock_consumed",
  adjustment: "inventory.stock_adjusted",
  reservation: "inventory.stock_reserved",
  release: "inventory.reservation_released",
}

/**
 * Single guarded stock movement (ADR-023). Steps:
 *   1. Resolve the material — must exist and be ACTIVE (QA#1 B-3 enforcement).
 *   2. Read current stock (a missing snapshot is treated as zero).
 *   3. Domain pre-check (`evaluateTransaction`) — fail fast, map error to ApplicationError.
 *   4. Persist atomically via the repository (Sprint D RPC = authoritative).
 *   5. Emit the domain event to the audit trail.
 * Thin nominal wrappers (receiveStock, consumeMaterial, …) fix the `type`.
 */
export async function applyStockMovement(
  { inventory, audit }: StockMovementDeps,
  input: StockMovementInput,
): Promise<StockMovementResult> {
  const material = await inventory.getMaterial(input.tenantId, input.materialId)
  if (!material) {
    throw new ApplicationError("Material not found.", "MATERIAL_NOT_FOUND")
  }
  if (!material.active) {
    throw new ApplicationError(
      "Cannot move stock for an inactive material.",
      "MATERIAL_INACTIVE",
    )
  }

  const item = await inventory.getInventoryItem(input.tenantId, input.materialId)
  const current: StockState = item
    ? { onHand: item.quantityOnHand, reserved: item.quantityReserved }
    : { onHand: 0, reserved: 0 }

  const evaluation = evaluateTransaction(current, {
    type: input.type,
    quantity: input.quantity,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    fulfillReservation: input.fulfillReservation,
  })
  if (!evaluation.ok) {
    throw new ApplicationError(
      `Stock movement rejected (${evaluation.error}).`,
      ERROR_CODE[evaluation.error],
    )
  }

  // Authoritative atomic apply (ledger + snapshot under row lock) — Sprint D.
  // Forward the domain-NORMALIZED quantity (QA#2 F-2), not the raw input.
  const result = await inventory.applyStockMovement({
    tenantId: input.tenantId,
    materialId: input.materialId,
    type: input.type,
    quantity: evaluation.quantity,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    fulfillReservation: input.fulfillReservation ?? false,
    createdBy: input.actorId,
  })

  await audit.append({
    eventType: EVENT_BY_TYPE[input.type],
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "inventory_item",
    subjectId: result.item.id,
    action: EVENT_BY_TYPE[input.type],
    metadata: {
      materialId: input.materialId,
      type: input.type,
      quantity: evaluation.quantity,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      onHand: result.item.quantityOnHand,
      reserved: result.item.quantityReserved,
      available: availableOf(
        result.item.quantityOnHand,
        result.item.quantityReserved,
      ),
    },
    requestId: input.requestId,
    source: "inventory",
  })

  return result
}
