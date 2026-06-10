import { describe, expect, it } from "vitest"

import { availableOf, type StockState } from "@/modules/inventory/domain/inventory-item"
import {
  effectOf,
  evaluateTransaction,
  isValidQuantity,
  isValidReference,
  type TransactionInput,
} from "@/modules/inventory/domain/inventory-transaction"

const REF = "11111111-1111-1111-1111-111111111111"
const state = (onHand: number, reserved: number): StockState => ({ onHand, reserved })

const input = (over: Partial<TransactionInput>): TransactionInput => ({
  type: "receipt",
  quantity: 1,
  referenceType: "manual",
  referenceId: null,
  ...over,
})

describe("availableOf", () => {
  it("is on_hand minus reserved", () => {
    expect(availableOf(10, 3)).toBe(7)
  })
})

describe("isValidQuantity", () => {
  it("requires > 0 for flow types and ≠ 0 (signed) for adjustment", () => {
    expect(isValidQuantity("receipt", 5)).toBe(true)
    expect(isValidQuantity("receipt", 0)).toBe(false)
    expect(isValidQuantity("receipt", -1)).toBe(false)
    expect(isValidQuantity("consumption", 2)).toBe(true)
    expect(isValidQuantity("adjustment", -3)).toBe(true)
    expect(isValidQuantity("adjustment", 3)).toBe(true)
    expect(isValidQuantity("adjustment", 0)).toBe(false)
    expect(isValidQuantity("receipt", Number.NaN)).toBe(false)
  })
})

describe("isValidReference", () => {
  it("requires a reference for work orders and forbids one otherwise", () => {
    expect(isValidReference("work_order", REF)).toBe(true)
    expect(isValidReference("work_order", null)).toBe(false)
    expect(isValidReference("work_order_execution", REF)).toBe(true)
    expect(isValidReference("manual", null)).toBe(true)
    expect(isValidReference("manual", REF)).toBe(false)
    expect(isValidReference("reconciliation", null)).toBe(true)
  })
})

describe("effectOf", () => {
  it("maps each type to the correct bucket deltas", () => {
    expect(effectOf("receipt", 5)).toEqual({ onHandDelta: 5, reservedDelta: 0 })
    expect(effectOf("consumption", 5)).toEqual({ onHandDelta: -5, reservedDelta: 0 })
    expect(
      effectOf("consumption", 5, { fulfillReservation: true, currentReserved: 5 }),
    ).toEqual({ onHandDelta: -5, reservedDelta: -5 })
    // Fix 2: reserved delta is capped at the currently reserved amount.
    expect(
      effectOf("consumption", 5, { fulfillReservation: true, currentReserved: 3 }),
    ).toEqual({ onHandDelta: -5, reservedDelta: -3 })
    expect(effectOf("adjustment", -3)).toEqual({ onHandDelta: -3, reservedDelta: 0 })
    expect(effectOf("reservation", 4)).toEqual({ onHandDelta: 0, reservedDelta: 4 })
    expect(effectOf("release", 4)).toEqual({ onHandDelta: 0, reservedDelta: -4 })
  })
})

describe("evaluateTransaction — happy paths", () => {
  it("receipt raises on_hand", () => {
    const r = evaluateTransaction(state(0, 0), input({ type: "receipt", quantity: 10 }))
    expect(r).toEqual({
      ok: true,
      next: state(10, 0),
      effect: { onHandDelta: 10, reservedDelta: 0 },
      quantity: 10,
    })
  })

  it("reservation raises reserved when available covers it", () => {
    const r = evaluateTransaction(state(10, 0), input({ type: "reservation", quantity: 4 }))
    expect(r.ok && r.next).toEqual(state(10, 4))
  })

  it("direct consumption lowers on_hand (no reservation needed)", () => {
    const r = evaluateTransaction(state(10, 0), input({ type: "consumption", quantity: 3 }))
    expect(r.ok && r.next).toEqual(state(7, 0))
  })

  it("consumption fulfilling a reservation lowers both buckets", () => {
    const r = evaluateTransaction(
      state(10, 4),
      input({ type: "consumption", quantity: 4, fulfillReservation: true }),
    )
    expect(r.ok && r.next).toEqual(state(6, 0))
  })

  it("release lowers reserved", () => {
    const r = evaluateTransaction(state(10, 4), input({ type: "release", quantity: 4 }))
    expect(r.ok && r.next).toEqual(state(10, 0))
  })

  it("negative adjustment lowers on_hand", () => {
    const r = evaluateTransaction(
      state(10, 0),
      input({ type: "adjustment", quantity: -3, referenceType: "reconciliation" }),
    )
    expect(r.ok && r.next).toEqual(state(7, 0))
  })

  it("positive adjustment raises on_hand", () => {
    const r = evaluateTransaction(
      state(10, 0),
      input({ type: "adjustment", quantity: 5, referenceType: "reconciliation" }),
    )
    expect(r.ok && r.next).toEqual(state(15, 0))
  })
})

describe("evaluateTransaction — invariant violations (DB CHECK parity)", () => {
  it("blocks oversell (consumption beyond on_hand)", () => {
    const r = evaluateTransaction(state(2, 0), input({ type: "consumption", quantity: 5 }))
    expect(r).toEqual({ ok: false, error: "ON_HAND_NEGATIVE" })
  })

  it("blocks reserving more than available", () => {
    const r = evaluateTransaction(state(10, 8), input({ type: "reservation", quantity: 5 }))
    expect(r).toEqual({ ok: false, error: "RESERVED_EXCEEDS_ON_HAND" })
  })

  it("blocks releasing more than reserved", () => {
    const r = evaluateTransaction(state(10, 2), input({ type: "release", quantity: 5 }))
    expect(r).toEqual({ ok: false, error: "RESERVED_NEGATIVE" })
  })

  it("blocks a negative adjustment that would strand reserved stock", () => {
    // on_hand 10, reserved 8 → adjust -5 → on_hand 5 < reserved 8
    const r = evaluateTransaction(
      state(10, 8),
      input({ type: "adjustment", quantity: -5, referenceType: "reconciliation" }),
    )
    expect(r).toEqual({ ok: false, error: "RESERVED_EXCEEDS_ON_HAND" })
  })

})

describe("Fix 2 — partial reservation fulfillment (reserved=3, consume=5)", () => {
  it("fulfills the reservation fully and consumes the rest directly", () => {
    // reserved 3, consume 5 fulfilling → reserved→0, on_hand−5 (NOT blocked).
    const r = evaluateTransaction(
      state(10, 3),
      input({ type: "consumption", quantity: 5, fulfillReservation: true }),
    )
    expect(r.ok && r.next).toEqual(state(5, 0))
  })

  it("still blocks if physical on_hand is insufficient", () => {
    const r = evaluateTransaction(
      state(4, 3),
      input({ type: "consumption", quantity: 5, fulfillReservation: true }),
    )
    expect(r).toEqual({ ok: false, error: "ON_HAND_NEGATIVE" })
  })
})

describe("Fix 3 — type ↔ referenceType matrix", () => {
  it("accepts valid combinations", () => {
    expect(
      evaluateTransaction(state(0, 0), input({ type: "receipt", quantity: 1, referenceType: "manual" })).ok,
    ).toBe(true)
    expect(
      evaluateTransaction(
        state(5, 0),
        input({ type: "consumption", quantity: 1, referenceType: "work_order", referenceId: REF }),
      ).ok,
    ).toBe(true)
    expect(
      evaluateTransaction(
        state(5, 0),
        input({ type: "adjustment", quantity: -1, referenceType: "reconciliation" }),
      ).ok,
    ).toBe(true)
  })

  it("rejects a receipt tied to a work order", () => {
    const r = evaluateTransaction(
      state(0, 0),
      input({ type: "receipt", quantity: 1, referenceType: "work_order", referenceId: REF }),
    )
    expect(r).toEqual({ ok: false, error: "INVALID_REFERENCE_FOR_TYPE" })
  })

  it("rejects an adjustment tied to a work order", () => {
    const r = evaluateTransaction(
      state(5, 0),
      input({ type: "adjustment", quantity: -1, referenceType: "work_order", referenceId: REF }),
    )
    expect(r).toEqual({ ok: false, error: "INVALID_REFERENCE_FOR_TYPE" })
  })
})

describe("Fix 1 — quantity normalization (numeric(14,4))", () => {
  it("eliminates float drift in projection", () => {
    // 0.1 + 0.2 then consume 0.3 must land exactly on 0, not -1e-16.
    const a = evaluateTransaction(state(0, 0), input({ type: "receipt", quantity: 0.1 }))
    const b = a.ok ? evaluateTransaction(a.next, input({ type: "receipt", quantity: 0.2 })) : a
    expect(b.ok && b.next.onHand).toBe(0.3)
    const c = b.ok
      ? evaluateTransaction(b.next, input({ type: "consumption", quantity: 0.3 }))
      : b
    expect(c.ok && c.next).toEqual(state(0, 0))
  })

  it("rejects a sub-precision quantity that normalizes to zero", () => {
    expect(
      evaluateTransaction(state(5, 0), input({ type: "receipt", quantity: 0.00001 })),
    ).toEqual({ ok: false, error: "INVALID_QUANTITY" })
  })

  it("rejects a quantity beyond the numeric(14,4) range", () => {
    expect(
      evaluateTransaction(state(0, 0), input({ type: "receipt", quantity: 1e10 })),
    ).toEqual({ ok: false, error: "INVALID_QUANTITY" })
  })
})

describe("evaluateTransaction — input validation", () => {
  it("rejects invalid quantity before touching stock", () => {
    expect(evaluateTransaction(state(5, 0), input({ type: "receipt", quantity: 0 }))).toEqual({
      ok: false,
      error: "INVALID_QUANTITY",
    })
  })

  it("rejects a malformed reference", () => {
    expect(
      evaluateTransaction(state(5, 0), input({ type: "receipt", quantity: 1, referenceType: "work_order", referenceId: null })),
    ).toEqual({ ok: false, error: "INVALID_REFERENCE" })
  })
})
