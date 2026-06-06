import type { CrmStatus } from "@/modules/crm/domain/company"
import type { Contact, ContactInput } from "@/modules/crm/domain/contact"
import type { ListQuery, Paginated } from "@/modules/crm/domain/pagination"
import type { UUID } from "@/types/shared"

export interface ContactRepository {
  list(tenantId: UUID, query: ListQuery): Promise<Paginated<Contact>>
  getById(tenantId: UUID, id: UUID): Promise<Contact | null>
  create(tenantId: UUID, input: ContactInput): Promise<Contact>
  update(tenantId: UUID, id: UUID, input: ContactInput): Promise<Contact>
  setStatus(tenantId: UUID, id: UUID, status: CrmStatus): Promise<void>
}
