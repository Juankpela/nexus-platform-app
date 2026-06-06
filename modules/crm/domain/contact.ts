import type { CrmStatus } from "@/modules/crm/domain/company"
import type { UUID } from "@/types/shared"

export type Contact = {
  id: UUID
  companyId: UUID | null
  companyName: string | null
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  title: string | null
  department: string | null
  notes: string | null
  status: CrmStatus
  createdAt: string
  updatedAt: string
}

export type ContactOption = {
  id: UUID
  name: string
  companyId: UUID | null
}

/** Fields a user may set when creating or editing a contact. */
export type ContactInput = {
  companyId: UUID | null
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  title: string | null
  department: string | null
  notes: string | null
}
