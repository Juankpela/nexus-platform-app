import type { AuditRepository } from "@/modules/audit/application/ports/audit-repository"
import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { Contact, ContactInput } from "@/modules/crm/domain/contact"
import type { UUID } from "@/types/shared"

export type CreateContactDeps = {
  contacts: ContactRepository
  audit: AuditRepository
}

export type CreateContactInput = {
  actorId: UUID
  tenantId: UUID
  requestId: UUID
  data: ContactInput
}

export async function createContact(
  { contacts, audit }: CreateContactDeps,
  input: CreateContactInput,
): Promise<Contact> {
  const contact = await contacts.create(input.tenantId, input.data)

  await audit.append({
    eventType: "crm.contact.created",
    actorType: "user",
    actorId: input.actorId,
    tenantId: input.tenantId,
    subjectType: "contact",
    subjectId: contact.id,
    action: "contact.created",
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
