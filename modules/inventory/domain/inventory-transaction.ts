import {
  projectStock,
  violationOf,
  type InvariantViolation,
  type StockEffect,
  type StockState,
} from "@/modules/inventory/domain/inventory-item"
import {
  isQuantityInRange,
  normalizeQuantity,
} from "@/modules/inventory/domain/quantity"
import type { UUID } from "@/types/shared"

/**
 * The five inventory movements (ADR-023). The `type` ALONE determines the effect
 * on stock — never the reference. Append-only ledger entries.
 */
export type TransactionType =
  | "receipt"
  | "consumption"
  | "adjustment"
  | "reservation"
  | "release"

export const TRANSACTION_TYPES: TransactionType[] = [
  "receipt",
  "consumption",
  "adjustment",
  "reservation",
  "release",
]

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  receipt: "Entrada",
  consumption: "Consumo",
  adjustment: "Ajuste",
  reservation: "Reserva",
  release: "Liberación",
}

/** Trace-only provenance of a movement (ADR-023). Never drives stock math. */
export type ReferenceType =
  | "work_order"
  | "work_order_execution"
  | "manual"
  | "reconciliation"

export const REFERENCE_TYPES: ReferenceType[] = [
  "work_order",
  "work_order_execution",
  "manual",
  "reconciliation",
]

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  work_order: "Orden de trabajo",
  work_order_execution: "Ejecución en campo",
  manual: "Manual",
  reconciliation: "Reconciliación",
}

/** A ledger entry (immutable). Pure domain type — no infrastructure. */
export type InventoryTransaction = {
  id: UUID
  tenantId: UUID
  materialId: UUID
  type: TransactionType
  quantity: number
  referenceType: ReferenceType
  referenceId: UUID | null
  createdBy: UUID
  createdAt: string
}

/**
 * Sign rule (mirrors the `inv_tx_qty_sign` CHECK): `adjustment` is the only signed
 * correction (≠ 0; negative lowers on_hand, positive raises it). Every other type
 * carries a positive magnitude and lets `type` imply the direction.
 */
export function isValidQuantity(type: TransactionType, quantity: number): boolean {
  // Must be finite AND within numeric(14,4) range (QA#1 Fix 1).
  if (!isQuantityInRange(quantity)) return false
  return type === "adjustment" ? quantity !== 0 : quantity > 0
}

/**
 * Valid `type → referenceType` combinations (QA#1 Fix 3). Administrative,
 * stock-changing/correcting movements (receipt, adjustment) are never tied to a
 * work order; commitment/field movements (consumption, reservation, release) may
 * reference a work order/execution or be manual.
 */
export const VALID_REFERENCE_TYPES: Record<TransactionType, ReferenceType[]> = {
  receipt: ["manual", "reconciliation"],
  consumption: ["work_order", "work_order_execution", "manual"],
  adjustment: ["manual", "reconciliation"],
  reservation: ["work_order", "work_order_execution", "manual"],
  release: ["work_order", "work_order_execution", "manual"],
}

/** Whether the referenceType is allowed for the given transaction type. */
export function isValidTypeReference(
  type: TransactionType,
  referenceType: ReferenceType,
): boolean {
  return VALID_REFERENCE_TYPES[type].includes(referenceType)
}

/**
 * Reference shape (mirrors the `inv_tx_reference_shape` CHECK): manual/reconciliation
 * carry no reference; work_order(_execution) require one.
 */
export function isValidReference(
  referenceType: ReferenceType,
  referenceId: UUID | null,
): boolean {
  const needsRef =
    referenceType === "work_order" || referenceType === "work_order_execution"
  return needsRef ? referenceId !== null : referenceId === null
}

/**
 * The effect of a transaction on the two stock buckets. `type` alone decides which
 * bucket and sign; `quantity` is signed only for `adjustment`. A `consumption` may
 * draw down a prior reservation (`fulfillReservation`): it then releases up to the
 * currently reserved amount — `min(quantity, currentReserved)` — so consuming more
 * than was reserved fulfills the reservation fully and consumes the rest directly,
 * instead of being blocked (QA#1 Fix 2).
 */
export function effectOf(
  type: TransactionType,
  quantity: number,
  options: { fulfillReservation?: boolean; currentReserved?: number } = {},
): StockEffect {
  switch (type) {
    case "receipt":
      return { onHandDelta: quantity, reservedDelta: 0 }
    case "consumption":
      return {
        onHandDelta: -quantity,
        reservedDelta: options.fulfillReservation
          ? -Math.min(quantity, Math.max(0, options.currentReserved ?? 0))
          : 0,
      }
    case "adjustment":
      return { onHandDelta: quantity, reservedDelta: 0 } // quantity is signed
    case "reservation":
      return { onHandDelta: 0, reservedDelta: quantity }
    case "release":
      return { onHandDelta: 0, reservedDelta: -quantity }
    default: {
      const exhaustive: never = type
      throw new Error(`Unknown transaction type: ${String(exhaustive)}`)
    }
  }
}

/** Input to evaluate a transaction against current stock. */
export type TransactionInput = {
  type: TransactionType
  quantity: number
  referenceType: ReferenceType
  referenceId: UUID | null
  fulfillReservation?: boolean
}

export type TransactionError =
  | "INVALID_QUANTITY"
  | "INVALID_REFERENCE"
  | "INVALID_REFERENCE_FOR_TYPE"
  | InvariantViolation

export type TransactionEvaluation =
  | { ok: true; next: StockState; effect: StockEffect; quantity: number }
  | { ok: false; error: TransactionError }

/**
 * Pure heart of the domain: validate a transaction and project the resulting
 * stock state, enforcing the same invariants the DB CHECKs do. The application
 * layer (Sprint C) maps a failure to an ApplicationError and, on success,
 * persists ledger + snapshot atomically via the RPC (Sprint D).
 */
export function evaluateTransaction(
  current: StockState,
  input: TransactionInput,
): TransactionEvaluation {
  // Quantize to numeric(14,4) FIRST, then validate (QA#1 Fix 1): a sub-precision
  // value like 0.00001 normalizes to 0 and is correctly rejected.
  const quantity = normalizeQuantity(input.quantity)
  if (!isValidQuantity(input.type, quantity)) {
    return { ok: false, error: "INVALID_QUANTITY" }
  }
  if (!isValidReference(input.referenceType, input.referenceId)) {
    return { ok: false, error: "INVALID_REFERENCE" }
  }
  if (!isValidTypeReference(input.type, input.referenceType)) {
    return { ok: false, error: "INVALID_REFERENCE_FOR_TYPE" }
  }
  const effect = effectOf(input.type, quantity, {
    fulfillReservation: input.fulfillReservation,
    currentReserved: current.reserved,
  })
  const next = projectStock(current, effect)
  const violation = violationOf(next)
  if (violation) return { ok: false, error: violation }
  // `quantity` is the normalized (4dp) value — the authoritative figure callers
  // must persist (QA#2 F-2), so domain and RPC never diverge on precision.
  return { ok: true, next, effect, quantity }
}
