import type { UUID } from "@/types/shared"
import type { OpportunityBusinessType } from "@/modules/crm/domain/opportunity"

// ── Status ──────────────────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  "new",
  "working",
  "qualified",
  "disqualified",
  "converted",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  working: "En gestión",
  qualified: "Calificado",
  disqualified: "Descalificado",
  converted: "Convertido",
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  working: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  qualified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  disqualified: "bg-muted text-muted-foreground",
  converted: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
}

/**
 * Manual status transitions. `converted` is reached only through the conversion
 * flow (not setStatus) and is terminal. `disqualified` can be reactivated.
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["working", "qualified", "disqualified"],
  working: ["qualified", "disqualified"],
  qualified: ["working", "disqualified"],
  disqualified: ["working"],
  converted: [],
}

/** A lead may be converted from any open status (not converted, not disqualified). */
export function canConvertLead(status: LeadStatus): boolean {
  return status !== "converted" && status !== "disqualified"
}

// ── Source (open attribute; suggested list for the UI / metrics) ──────────────

export const LEAD_SOURCES = [
  "web",
  "referral",
  "event",
  "cold_call",
  "social",
  "other",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  web: "Web",
  referral: "Referido",
  event: "Evento",
  cold_call: "Llamada en frío",
  social: "Redes sociales",
  other: "Otro",
}

// ── Domain types ─────────────────────────────────────────────────────────────

export type Lead = {
  id: UUID
  name: string
  company: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  ownerId: UUID | null
  notes: string | null
  convertedOpportunityId: UUID | null
  convertedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Fields a user sets when creating/editing a lead (status/owner managed separately). */
export type LeadInput = {
  name: string
  company: string | null
  email: string | null
  phone: string | null
  source: string | null
  notes: string | null
}

export type LeadListQuery = {
  search: string | null
  status: LeadStatus | null
  source: string | null
  page: number
  pageSize: number
}

/** Data captured at conversion to build the Opportunity (which requires these). */
export type LeadConversionInput = {
  opportunityName: string
  businessType: OpportunityBusinessType
}

// ── Funnel metrics (minimal dashboard) ────────────────────────────────────────

export type LeadFunnelMetrics = {
  created: number
  converted: number
  /** converted / created, 0..1. */
  conversionRate: number
  bySource: { source: string; count: number }[]
}
