import type { UUID } from "@/types/shared"

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  reset: string
}

export interface RateLimiter {
  /**
   * Atomically evaluate the sliding window for BOTH the API key and the tenant
   * (ADR-025 #12). Denied if either limit is exceeded.
   */
  consume(
    apiKeyId: UUID,
    tenantId: UUID,
    keyLimit: number,
    tenantLimit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>
}
