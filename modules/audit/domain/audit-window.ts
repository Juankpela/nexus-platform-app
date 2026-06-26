import { ApplicationError } from "@/lib/errors/application-error"

/** Default cap on rows returned by a single audit-window read. */
export const AUDIT_WINDOW_DEFAULT_LIMIT = 500
/** Hard ceiling to protect the DB from an unbounded scan. */
export const AUDIT_WINDOW_MAX_LIMIT = 5000

export type AuditWindowInput = {
  /** Inclusive lower bound, ISO-8601. */
  start: string
  /** Inclusive upper bound, ISO-8601. */
  end: string
  /** Optional event_type filter; empty/absent means "all types". */
  eventTypes?: readonly string[]
  /** Optional row cap; defaults to AUDIT_WINDOW_DEFAULT_LIMIT. */
  limit?: number
}

export type AuditWindowQuery = {
  startISO: string
  endISO: string
  /** Empty array means "no event_type filter". */
  eventTypes: string[]
  limit: number
}

function toInstant(value: string, field: string): number {
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) {
    throw new ApplicationError(
      `Invalid audit window ${field}: "${value}".`,
      "INVALID_AUDIT_WINDOW",
    )
  }
  return ms
}

/**
 * Validates and normalizes the parameters of a tenant audit-window read.
 * Pure (no I/O) so it is unit-testable and reusable by any reader — the
 * observation seam N-LABS relies on. Throws ApplicationError on a bad window.
 */
export function resolveAuditWindow(input: AuditWindowInput): AuditWindowQuery {
  const startMs = toInstant(input.start, "start")
  const endMs = toInstant(input.end, "end")
  if (startMs > endMs) {
    throw new ApplicationError(
      "Audit window start must not be after end.",
      "INVALID_AUDIT_WINDOW",
    )
  }

  const eventTypes = Array.from(
    new Set(
      (input.eventTypes ?? [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    ),
  )

  const requested = input.limit ?? AUDIT_WINDOW_DEFAULT_LIMIT
  const limit = Math.min(
    AUDIT_WINDOW_MAX_LIMIT,
    Math.max(1, Math.trunc(requested)),
  )

  return {
    startISO: new Date(startMs).toISOString(),
    endISO: new Date(endMs).toISOString(),
    eventTypes,
    limit,
  }
}
