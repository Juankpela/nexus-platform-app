import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { AuditEvent } from "@/modules/audit/domain/audit-event"
import type { CaseRepository } from "@/modules/service/application/ports/case-repository"
import {
  CASE_STATUS_TRANSITIONS,
  type CaseStatus,
} from "@/modules/service/domain/case"
import type { UUID } from "@/types/shared"

export type ChangeCaseStatusDeps = {
  cases: CaseRepository
  audit: AuditRepository
}

export type ChangeCaseStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: CaseStatus
}

export async function changeCaseStatus(
  { cases, audit }: ChangeCaseStatusDeps,
  input: ChangeCaseStatusInput,
): Promise<void> {
  const existing = await cases.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Case not found.", "CASE_NOT_FOUND")
  }
  if (existing.status === input.status) return

  const allowed = CASE_STATUS_TRANSITIONS[existing.status]
  if (!allowed.includes(input.status)) {
    throw new ApplicationError(
      `Cannot move a ${existing.status} case to ${input.status}.`,
      "INVALID_CASE_STATUS_TRANSITION",
    )
  }

  const now = new Date().toISOString()
  const timestamps: { resolvedAt?: string | null; closedAt?: string | null } = {}
  if (input.status === "resolved") timestamps.resolvedAt = now
  if (input.status === "closed") timestamps.closedAt = now
  // Reopening clears the resolution timestamp.
  if (input.status === "working" && existing.resolvedAt) {
    timestamps.resolvedAt = null
  }

  await cases.setStatus(input.tenantId, input.id, input.status, timestamps)

  const base: Omit<AuditEvent, "eventType" | "action"> = {
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "case",
    subjectId: input.id,
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  }

  await audit.append({
    ...base,
    eventType: "service.case.status_changed",
    action: "case.status_changed",
  })

  if (input.status === "escalated") {
    await audit.append({
      ...base,
      eventType: "service.case.escalated",
      action: "case.escalated",
    })
  } else if (input.status === "resolved") {
    await audit.append({
      ...base,
      eventType: "service.case.resolved",
      action: "case.resolved",
    })
  } else if (input.status === "closed") {
    await audit.append({
      ...base,
      eventType: "service.case.closed",
      action: "case.closed",
    })
  }
}
