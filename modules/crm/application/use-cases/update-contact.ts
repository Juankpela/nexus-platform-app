import { ApplicationError } from "@/lib/errors/application-error"
import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { Contact, ContactInput } from "@/modules/crm/domain/contact"
import type { UUID } from "@/types/shared"

export type UpdateContactDeps = {
  contacts: ContactRepository
  audit: AuditRepository
}

export type UpdateContactInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  id: UUID
  data: ContactInput
}

export async function updateContact(
  { contacts, audit }: UpdateContactDeps,
  input: UpdateContactInput,
): Promise<Contact> {
  const existing = await contacts.getById(input.tenantId, input.id)
  if (!existing) {
    throw new ApplicationError("Contact not found.", "CONTACT_NOT_FOUND")
  }

  const contact = await contacts.update(input.tenantId, input.id, input.data)

  await audit.append({
    eventType: "crm.contact.updated",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "contact",
    subjectId: contact.id,
    action: "contact.updated",
    metadata: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      companyId: contact.companyId,
    },
    requestId: input.requestId,
    source: "web",
  })

  return contact
}
