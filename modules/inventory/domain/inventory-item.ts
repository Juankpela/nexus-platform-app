import { normalizeQuantity } from "@/modules/inventory/domain/quantity"
import type { UUID } from "@/types/shared"

/**
 * InventoryItem — the per-material stock snapshot (ADR-023), derived from the
 * immutable transaction ledger. `quantityAvailable` is always `onHand - reserved`
 * (a generated column in the DB). Pure domain type — no infrastructure.
 */
export type InventoryItem = {
  id: UUID
  tenantId: UUID
  materialId: UUID
  quantityOnHand: number
  quantityReserved: number
  quantityAvailable: number
  createdAt: string
  updatedAt: string
}

/** The two mutable stock buckets — the minimal state a transaction acts upon. */
export type StockState = {
  onHand: number
  reserved: number
}

/** available = on_hand - reserved (the single derived value), quantized to 4dp. */
export function availableOf(onHand: number, reserved: number): number {
  return normalizeQuantity(onHand - reserved)
}

/** Signed deltas a transaction applies to the two buckets. */
export type StockEffect = {
  onHandDelta: number
  reservedDelta: number
}

/**
 * Apply an effect to a state, quantizing to 4 decimals (numeric(14,4)). Clears
 * binary-float drift so invariants compare exactly. Does not validate invariants.
 */
export function projectStock(current: StockState, effect: StockEffect): StockState {
  return {
    onHand: normalizeQuantity(current.onHand + effect.onHandDelta),
    reserved: normalizeQuantity(current.reserved + effect.reservedDelta),
  }
}

/**
 * The stock invariants enforced by DB CHECKs, expressed in the domain so the
 * application can reject a transaction before it reaches the database.
 */
export type InvariantViolation =
  | "ON_HAND_NEGATIVE"
  | "RESERVED_NEGATIVE"
  | "RESERVED_EXCEEDS_ON_HAND"

/** Returns the violated invariant, or null if the state is valid. */
export function violationOf(state: StockState): InvariantViolation | null {
  if (state.onHand < 0) return "ON_HAND_NEGATIVE"
  if (state.reserved < 0) return "RESERVED_NEGATIVE"
  if (state.reserved > state.onHand) return "RESERVED_EXCEEDS_ON_HAND"
  return null
}
