import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { CrmStatus } from "@/modules/crm/domain/company"
import type { UUID } from "@/types/shared"

export type ChangeContactStatusDeps = {
  contacts: ContactRepository
  audit: AuditRepository
}

export type ChangeContactStatusInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  status: CrmStatus
}

export async function changeContactStatus(
  { contacts, audit }: ChangeContactStatusDeps,
  input: ChangeContactStatusInput,
): Promise<void> {
  const existing = await contacts.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Contact not found.", "CONTACT_NOT_FOUND")
  }
  if (existing.status === input.status) return

  await contacts.setStatus(input.tenantId, input.id, input.status)

  const deactivated = input.status === "inactive"
  await audit.append({
    eventType: deactivated ? "crm.contact.deactivated" : "crm.contact.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "contact",
    subjectId: input.id,
    action: deactivated ? "contact.deactivated" : "contact.updated",
    metadata: { from: existing.status, to: input.status },
    requestId: input.requestId,
    source: "web",
  })
}
