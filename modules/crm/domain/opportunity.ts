import type { UUID } from "@/types/shared"

export type OpportunityBusinessType =
  | "flexography"
  | "inks"
  | "consumables"
  | "consulting"
  | "machinery"

export type OpportunityStatus =
  | "new"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"

export const OPPORTUNITY_BUSINESS_TYPES: OpportunityBusinessType[] = [
  "flexography",
  "inks",
  "consumables",
  "consulting",
  "machinery",
]

export const OPPORTUNITY_BUSINESS_TYPE_LABELS: Record<
  OpportunityBusinessType,
  string
> = {
  flexography: "Flexography",
  inks: "Inks",
  consumables: "Consumables",
  consulting: "Consulting",
  machinery: "Machinery",
}

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  "new",
  "discovery",
  "proposal",
  "negotiation",
  "won",
  "lost",
]

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  new: "New",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}

export type Opportunity = {
  id: UUID
  companyId: UUID
  companyName: string | null
  contactId: UUID
  contactName: string | null
  name: string
  businessType: OpportunityBusinessType
  estimatedValue: number | null
  probability: number
  status: OpportunityStatus
  expectedCloseDate: string | null
  ownerId: UUID | null
  description: string | null
  createdAt: string
  updatedAt: string
}

/** Fields set when creating or editing an opportunity (status/owner managed separately). */
export type OpportunityInput = {
  companyId: UUID
  contactId: UUID
  name: string
  businessType: OpportunityBusinessType
  estimatedValue: number | null
  probability: number
  expectedCloseDate: string | null
  description: string | null
}

export type OpportunityFilters = {
  search: string | null
  status: OpportunityStatus | null
}
