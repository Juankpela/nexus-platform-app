import type { UUID } from "@/types/shared"

export type CaseStatus =
  | "new"
  | "working"
  | "waiting_customer"
  | "escalated"
  | "resolved"
  | "closed"

export type CasePriority = "low" | "medium" | "high" | "critical"

export type CaseOrigin = "phone" | "email" | "whatsapp" | "web" | "manual"

export const CASE_STATUSES: CaseStatus[] = [
  "new",
  "working",
  "waiting_customer",
  "escalated",
  "resolved",
  "closed",
]

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  new: "Nuevo",
  working: "En progreso",
  waiting_customer: "Esperando cliente",
  escalated: "Escalado",
  resolved: "Resuelto",
  closed: "Cerrado",
}

export const CASE_PRIORITIES: CasePriority[] = [
  "low",
  "medium",
  "high",
  "critical",
]

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
}

export const CASE_ORIGINS: CaseOrigin[] = [
  "phone",
  "email",
  "whatsapp",
  "web",
  "manual",
]

export const CASE_ORIGIN_LABELS: Record<CaseOrigin, string> = {
  phone: "Teléfono",
  email: "Email",
  whatsapp: "WhatsApp",
  web: "Web",
  manual: "Manual",
}

/**
 * Allowed next statuses for each current status. `closed` is terminal.
 * `resolved` can move back to `working` to reopen. Open states can escalate
 * or close directly. Mirrors the opportunity/quote state-machine pattern.
 */
export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  new: ["working", "escalated", "closed"],
  working: ["waiting_customer", "escalated", "resolved", "closed"],
  waiting_customer: ["working", "escalated", "resolved", "closed"],
  escalated: ["working", "resolved", "closed"],
  resolved: ["working", "closed"],
  closed: [],
}

export type Case = {
  id: UUID
  caseNumber: string
  subject: string
  description: string | null
  status: CaseStatus
  priority: CasePriority
  origin: CaseOrigin
  companyId: UUID | null
  companyName: string | null
  contactId: UUID | null
  contactName: string | null
  assetId: UUID | null
  assetName: string | null
  ownerId: UUID | null
  workOrderId: UUID | null
  /** Skill (categoría) elegida en el reporte público — autoritativa para coordinar. */
  reportedSkillId: UUID | null
  /** Tipo de daño (etiqueta legible legacy). La fuente estructurada es issueTypeId. */
  incidentType: string | null
  /** Tipo de daño estructurado (FK a service_issue_types). Fuente de verdad. */
  issueTypeId: UUID | null
  /** WhatsApp/teléfono del reportante (reporte público), para avisar al cliente. */
  reporterPhone: string | null
  /** Token público de seguimiento (/seguimiento/[token]). */
  trackingToken: string | null
  slaDueAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

/** Fields a user may set when creating/editing a case (status/owner managed separately). */
export type CaseInput = {
  subject: string
  description: string | null
  priority: CasePriority
  origin: CaseOrigin
  companyId: UUID | null
  contactId: UUID | null
  assetId: UUID | null
}

export type CaseFilters = {
  search: string | null
  status: CaseStatus | null
  priority: CasePriority | null
  ownerId: UUID | null
  /** Optional: restrict to one company (used by the customer page). */
  companyId?: UUID | null
}
