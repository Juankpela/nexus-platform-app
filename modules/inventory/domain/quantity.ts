/**
 * Quantity normalization aligned with the DB column `numeric(14,4)` (ADR-023,
 * QA#1 Fix 1). All stock arithmetic in the domain is quantized to 4 decimals so it
 * matches exactly what PostgreSQL stores and cannot drift (e.g. 0.1 + 0.2). This is
 * the SINGLE place quantity precision/range is defined. Pure — no infrastructure.
 */

/** Decimal places of numeric(14,4). */
export const QUANTITY_SCALE = 4

const FACTOR = 10 ** QUANTITY_SCALE

/** numeric(14,4) has 10 integer digits ⇒ magnitude must be strictly < 10^10. */
export const QUANTITY_MAX_ABS = 10 ** 10

/**
 * Round to 4 decimals (matching numeric(14,4)), clearing binary-float noise.
 * Non-finite input passes through unchanged so validators can reject it.
 */
export function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return value
  return Math.round(value * FACTOR) / FACTOR
}

/** Finite and within the numeric(14,4) magnitude range. */
export function isQuantityInRange(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) < QUANTITY_MAX_ABS
}
