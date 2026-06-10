import "server-only"

import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import { hasScope, type ApiContext, type ApiScope } from "@/modules/api/domain/api-key"
import { problemFor } from "@/modules/api/domain/api-problem"
import type { RateLimitResult } from "@/modules/api/application/ports/rate-limiter"

export type ApiGateDeps = {
  resolve: (authorization: string | null, now: string) => Promise<ApiContext>
  consume: (apiKeyId: string, tenantId: string) => Promise<RateLimitResult>
  audit: AuditRepository
}

export type ApiHandlerResult = { data: unknown; page?: unknown }

/**
 * The public-API gate (ADR-025): generate X-Request-Id → authenticate (API key) →
 * scope check (deny-by-default) → rate limit → run → audit → respond. Errors become
 * RFC 7807 problem+json carrying the request id. Every outcome is audited.
 */
export async function runApiGate(
  deps: ApiGateDeps,
  req: Request,
  scope: ApiScope,
  run: (ctx: ApiContext) => Promise<ApiHandlerResult>,
): Promise<Response> {
  const requestId = randomUUID()
  const url = new URL(req.url)
  let ctx: ApiContext | null = null

  const emit = async (
    action: "api.request" | "api.request_denied",
    status: number,
    resultCount?: number,
  ) => {
    try {
      await deps.audit.append({
        eventType: action,
        actorType: "service",
        actorId: ctx?.apiKeyId ?? null,
        tenantId: ctx?.tenantId ?? null,
        subjectType: "api",
        action,
        metadata: {
          method: req.method,
          path: url.pathname,
          scope,
          status,
          ...(resultCount !== undefined ? { resultCount } : {}),
        },
        requestId,
        source: "api",
      })
    } catch {
      // Audit failure must never affect the API response.
    }
  }

  const respond = (status: number, body: unknown, rl?: RateLimitResult) => {
    const headers: Record<string, string> = { "X-Request-Id": requestId }
    if (rl) {
      headers["X-RateLimit-Limit"] = String(rl.limit)
      headers["X-RateLimit-Remaining"] = String(rl.remaining)
      headers["X-RateLimit-Reset"] = rl.reset
    }
    if (status === 429) headers["Retry-After"] = "60"
    return NextResponse.json(body, { status, headers })
  }

  try {
    ctx = await deps.resolve(req.headers.get("authorization"), new Date().toISOString())
    if (!hasScope(ctx.scopes, scope)) {
      throw new ApplicationError(`Missing required scope: ${scope}`, "FORBIDDEN")
    }
    const rl = await deps.consume(ctx.apiKeyId, ctx.tenantId)
    if (!rl.allowed) {
      await emit("api.request_denied", 429)
      return respond(429, problemFor("RATE_LIMITED", "Rate limit exceeded.", requestId), rl)
    }
    const result = await run(ctx)
    await emit("api.request", 200, Array.isArray(result.data) ? result.data.length : undefined)
    return respond(200, result, rl)
  } catch (e) {
    const code = e instanceof ApplicationError ? e.code : "INTERNAL"
    const message = e instanceof Error ? e.message : "Unexpected error."
    const problem = problemFor(code, message, requestId)
    await emit("api.request_denied", problem.status)
    return respond(problem.status, problem)
  }
}
