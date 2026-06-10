import "server-only"

import { createHash, randomBytes } from "node:crypto"

import type { KeyPrefix } from "@/modules/api/domain/api-key"

/** SHA-256 of the full presented key — what we store and look up by. */
export function hashKey(fullKey: string): string {
  return createHash("sha256").update(fullKey, "utf8").digest("hex")
}

/** Generate a high-entropy env-prefixed key. The full key is shown to the caller once. */
export function generateApiKey(prefix: KeyPrefix): {
  fullKey: string
  keyHash: string
} {
  const secret = randomBytes(24).toString("base64url")
  const fullKey = `${prefix}_${secret}`
  return { fullKey, keyHash: hashKey(fullKey) }
}
