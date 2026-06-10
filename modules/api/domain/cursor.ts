/**
 * Keyset cursor (ADR-025 #5). v1 keysets on `id` (UUID): unique, immutable and
 * totally ordered → deterministic, stable pagination under concurrent writes. The
 * cursor is opaque base64url to the consumer; ordering field is an implementation
 * detail that can evolve to a composite (created_at,id) without changing the contract.
 * Pure.
 */
export type Cursor = { id: string }

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url")
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"))
    return obj && typeof obj.id === "string" ? { id: obj.id } : null
  } catch {
    return null
  }
}
