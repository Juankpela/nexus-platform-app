import type { ContactRepository } from "@/modules/crm/application/ports/contact-repository"
import type { Contact } from "@/modules/crm/domain/contact"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export async function listContacts(
  contacts: ContactRepository,
  tenantId: UUID,
  query: ListQuery,
): Promise<Paginated<Contact>> {
  return contacts.list(tenantId, query)
}
