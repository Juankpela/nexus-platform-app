import { describe, expect, it } from "vitest"

import { decodeCursor, encodeCursor } from "@/modules/api/domain/cursor"

describe("keyset cursor", () => {
  it("round-trips an id", () => {
    const c = { id: "44444444-4444-4444-4444-444444444444" }
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
  })
  it("is opaque base64url (no raw id leak)", () => {
    expect(encodeCursor({ id: "abc" })).not.toContain("abc")
  })
  it("returns null for garbage / malformed", () => {
    expect(decodeCursor("not-base64-$$$")).toBeNull()
    expect(decodeCursor(Buffer.from('{"x":1}').toString("base64url"))).toBeNull()
  })
})
