import type { UUID } from "@/types/shared"

export type CrmStatus = "active" | "inactive"

export type Company = {
  id: UUID
  name: string
  taxId: string | null
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  notes: string | null
  status: CrmStatus
  createdAt: string
  updatedAt: string
}

/** Fields a user may set when creating or editing a company. */
export type CompanyInput = {
  name: string
  taxId: string | null
  industry: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  notes: string | null
}

export type CompanyOption = { id: UUID; name: string }
