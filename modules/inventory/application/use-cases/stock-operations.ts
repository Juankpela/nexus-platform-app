import {
  applyStockMovement,
  type StockMovementDeps,
} from "@/modules/inventory/application/use-cases/apply-stock-movement"
import type { StockMovementResult } from "@/modules/inventory/application/ports/inventory-repository"
import type { ReferenceType } from "@/modules/inventory/domain/inventory-transaction"
import type { UUID } from "@/types/shared"

/**
 * Nominal stock operations (intention-revealing wrappers over the single guarded
 * `applyStockMovement`, each fixing the `type`). The caller supplies the
 * referenceType/referenceId explicitly — the domain enforces the valid
 * type↔referenceType matrix (QA#1 Fix 3).
 */
export type StockOpInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  materialId: UUID
  quantity: number
  referenceType: ReferenceType
  referenceId: UUID | null
}

export function receiveStock(
  deps: StockMovementDeps,
  input: StockOpInput,
): Promise<StockMovementResult> {
  return applyStockMovement(deps, { ...input, type: "receipt" })
}

export function adjustStock(
  deps: StockMovementDeps,
  input: StockOpInput,
): Promise<StockMovementResult> {
  return applyStockMovement(deps, { ...input, type: "adjustment" })
}

export function reserveMaterial(
  deps: StockMovementDeps,
  input: StockOpInput,
): Promise<StockMovementResult> {
  return applyStockMovement(deps, { ...input, type: "reservation" })
}

export function releaseReservation(
  deps: StockMovementDeps,
  input: StockOpInput,
): Promise<StockMovementResult> {
  return applyStockMovement(deps, { ...input, type: "release" })
}

export function consumeMaterial(
  deps: StockMovementDeps,
  input: StockOpInput & { fulfillReservation?: boolean },
): Promise<StockMovementResult> {
  return applyStockMovement(deps, { ...input, type: "consumption" })
}
