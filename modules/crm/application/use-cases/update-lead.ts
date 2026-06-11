import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import type { Lead, LeadInput } from "@/modules/crm/domain/lead"
import type { UUID } from "@/types/shared"

export type UpdateLeadDeps = { leads: LeadRepository; audit: AuditRepository }

export type UpdateLeadInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: LeadInput
}

export async function updateLead(
  { leads, audit }: UpdateLeadDeps,
  input: UpdateLeadInput,
): Promise<Lead> {
  const existing = await leads.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Lead not found.", "LEAD_NOT_FOUND")
  }
  if (existing.status === "converted") {
    throw new ApplicationError(
      "A converted lead can no longer be edited.",
      "LEAD_CONVERTED",
    )
  }

  const lead = await leads.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "crm.lead.updated",
    action: "lead.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "lead",
    subjectId: lead.id,
    metadata: {},
    requestId: input.requestId,
    source: "web",
  })

  return lead
}
