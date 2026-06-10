import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type {
  RateLimitResult,
  RateLimiter,
} from "@/modules/api/application/ports/rate-limiter"
import type { UUID } from "@/types/shared"

export class SupabaseRateLimiter implements RateLimiter {
  async consume(
    apiKeyId: UUID,
    tenantId: UUID,
    keyLimit: number,
    tenantLimit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.rpc("consume_rate_limit", {
      p_api_key_id: apiKeyId,
      p_tenant_id: tenantId,
      p_key_limit: keyLimit,
      p_tenant_limit: tenantLimit,
      p_window_seconds: windowSeconds,
    })
    if (error || !data) {
      throw new ApplicationError("Rate limiter unavailable.", "RATE_LIMITER_FAILED", error)
    }
    const r = data as unknown as {
      allowed: boolean
      limit: number
      remaining: number
      reset: string
    }
    return { allowed: r.allowed, limit: r.limit, remaining: r.remaining, reset: r.reset }
  }
}
