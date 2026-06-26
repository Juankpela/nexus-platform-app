import { describe, expect, it } from "vitest"

import { resolveAnthropicApiKey } from "@/lib/ai/anthropic-api-key"

describe("resolveAnthropicApiKey", () => {
  it("returns the trimmed key when present", () => {
    expect(resolveAnthropicApiKey("  sk-ant-123  ")).toBe("sk-ant-123")
  })

  it("throws a helpful error when the key is undefined", () => {
    expect(() => resolveAnthropicApiKey(undefined)).toThrowError(/ANTHROPIC_API_KEY/)
  })

  it("throws when the key is empty or whitespace only", () => {
    expect(() => resolveAnthropicApiKey("")).toThrowError(/ANTHROPIC_API_KEY/)
    expect(() => resolveAnthropicApiKey("   ")).toThrowError(/ANTHROPIC_API_KEY/)
  })
})
