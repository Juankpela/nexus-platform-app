import "server-only"

import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import { issueApiKey, type IssueApiKeyInput } from "@/modules/api/application/use-cases/issue-api-key"
import { resolveApiContext } from "@/modules/api/application/use-cases/resolve-api-context"
import { generateApiKey, hashKey } from "@/modules/api/infrastructure/api-key-crypto"
import { SupabaseApiKeyRepository } from "@/modules/api/infrastructure/supabase-api-key-repository"
import { SupabaseRateLimiter } from "@/modules/api/infrastructure/supabase-rate-limiter"
import {
  runApiGate,
  type ApiHandlerResult,
} from "@/modules/api/presentation/with-api"
import type { ApiContext, ApiScope } from "@/modules/api/domain/api-key"

/** Public-API limits (ADR-025 #12): sliding window, per-key AND per-tenant. */
export const API_RATE = { keyLimit: 600, tenantLimit: 5000, windowSeconds: 60 }

function keyRepo() {
  return new SupabaseApiKeyRepository()
}

/** Run a public-API endpoint through the gate (auth + scope + rate limit + audit). */
export function apiGate(
  req: Request,
  scope: ApiScope,
  run: (ctx: ApiContext) => Promise<ApiHandlerResult>,
): Promise<Response> {
  const limiter = new SupabaseRateLimiter()
  return runApiGate(
    {
      resolve: (auth, now) => resolveApiContext({ apiKeys: keyRepo(), hashKey }, auth, now),
      consume: (apiKeyId, tenantId) =>
        limiter.consume(
          apiKeyId,
          tenantId,
          API_RATE.keyLimit,
          API_RATE.tenantLimit,
          API_RATE.windowSeconds,
        ),
      audit: new SupabaseAuditRepository(),
    },
    req,
    scope,
    run,
  )
}

/** Issue a new API key (deny-by-default scopes). Returns the full key ONCE. */
export function issueApiKeyForTenant(input: IssueApiKeyInput) {
  return issueApiKey(
    { apiKeys: keyRepo(), audit: new SupabaseAuditRepository(), generate: generateApiKey },
    input,
  )
}
