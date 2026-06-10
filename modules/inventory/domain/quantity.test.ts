import { describe, expect, it } from "vitest"

import {
  QUANTITY_MAX_ABS,
  isQuantityInRange,
  normalizeQuantity,
} from "@/modules/inventory/domain/quantity"

describe("normalizeQuantity", () => {
  it("clears binary-float noise (0.1 + 0.2 = 0.3)", () => {
    expect(normalizeQuantity(0.1 + 0.2)).toBe(0.3)
  })

  it("rounds to 4 decimals", () => {
    expect(normalizeQuantity(1.23456)).toBe(1.2346)
    expect(normalizeQuantity(1.23454)).toBe(1.2345)
  })

  it("leaves whole numbers and 4dp values intact", () => {
    expect(normalizeQuantity(5)).toBe(5)
    expect(normalizeQuantity(2.5)).toBe(2.5)
  })

  it("passes non-finite values through (for validators to reject)", () => {
    expect(Number.isNaN(normalizeQuantity(Number.NaN))).toBe(true)
    expect(normalizeQuantity(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("isQuantityInRange", () => {
  it("accepts values inside numeric(14,4) magnitude", () => {
    expect(isQuantityInRange(0)).toBe(true)
    expect(isQuantityInRange(9_999_999_999.9999)).toBe(true)
    expect(isQuantityInRange(-1234.5678)).toBe(true)
  })

  it("rejects out-of-range and non-finite values", () => {
    expect(isQuantityInRange(QUANTITY_MAX_ABS)).toBe(false)
    expect(isQuantityInRange(1e11)).toBe(false)
    expect(isQuantityInRange(Number.NaN)).toBe(false)
    expect(isQuantityInRange(Number.POSITIVE_INFINITY)).toBe(false)
  })
})
