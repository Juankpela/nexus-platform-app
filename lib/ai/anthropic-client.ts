import "server-only"

import Anthropic from "@anthropic-ai/sdk"

import { resolveAnthropicApiKey } from "@/lib/ai/anthropic-api-key"

/**
 * Single source of truth for constructing an Anthropic client. Reads
 * ANTHROPIC_API_KEY at call time and throws a clear runtime error if missing.
 * Reuse this everywhere instead of instantiating the SDK inline (precondition
 * P3): the N-LABS reasoning step and the existing AI insights share it.
 */
export function createAnthropicClient(): Anthropic {
  return new Anthropic({
    apiKey: resolveAnthropicApiKey(process.env.ANTHROPIC_API_KEY),
  })
}
