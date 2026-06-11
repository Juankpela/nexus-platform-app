import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { LeadRepository } from "@/modules/crm/application/ports/lead-repository"
import type { Lead, LeadInput } from "@/modules/crm/domain/lead"
import type { UUID } from "@/types/shared"

export type CreateLeadDeps = { leads: LeadRepository; audit: AuditRepository }

export type CreateLeadInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  ownerId: UUID | null
  data: LeadInput
}

export async function createLead(
  { leads, audit }: CreateLeadDeps,
  input: CreateLeadInput,
): Promise<Lead> {
  const ownerId = input.ownerId ?? input.actorId
  const lead = await leads.create(input.tenantId, ownerId, input.data)

  await audit.append({
    eventType: "crm.lead.created",
    action: "lead.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "lead",
    subjectId: lead.id,
    metadata: { name: lead.name, source: lead.source },
    requestId: input.requestId,
    source: "web",
  })

  return lead
}
