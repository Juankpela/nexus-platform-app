import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import {
  LEAD_STATUS_TRANSITIONS,
  type LeadStatus,
} from "@/modules/crm/domain/lead"
import type { UUID } from "@/types/shared"

export type ChangeLeadStatusDeps = {
  leads: LeadRepository
  audit: AuditRepository
}

export type ChangeLeadStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: LeadStatus
}

export async function changeLeadStatus(
  { leads, audit }: ChangeLeadStatusDeps,
  input: ChangeLeadStatusInput,
): Promise<void> {
  const existing = await leads.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Lead not found.", "LEAD_NOT_FOUND")
  }
  if (existing.status === input.status) return

  // `converted` is reached only through the conversion flow, never setStatus.
  if (input.status === "converted") {
    throw new ApplicationError(
      "Use the conversion flow to convert a lead.",
      "LEAD_USE_CONVERSION",
    )
  }
  if (!LEAD_STATUS_TRANSITIONS[existing.status].includes(input.status)) {
    throw new ApplicationError(
      `Cannot move a ${existing.status} lead to ${input.status}.`,
      "INVALID_LEAD_STATUS_TRANSITION",
    )
  }

  await leads.setStatus(input.tenantId, input.id, input.status)

  await audit.append({
    eventType: "crm.lead.status_changed",
    action: "lead.status_changed",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "lead",
    subjectId: input.id,
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  })
}
