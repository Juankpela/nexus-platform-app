import type { UUID } from "@/types/shared"

export type ActivityType =
  | "call"
  | "email"
  | "meeting"
  | "task"
  | "note"
  | "whatsapp"

export type ActivityStatus = "open" | "completed"

export const ACTIVITY_TYPES: ActivityType[] = [
  "call",
  "email",
  "meeting",
  "task",
  "note",
  "whatsapp",
]

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  task: "Task",
  note: "Note",
  whatsapp: "WhatsApp",
}

export type Activity = {
  id: UUID
  type: ActivityType
  subject: string
  body: string | null
  companyId: UUID | null
  contactId: UUID | null
  opportunityId: UUID | null
  caseId: UUID | null
  assetId: UUID | null
  status: ActivityStatus
  dueAt: string | null
  completedAt: string | null
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

/** Fields a user may set when creating or editing an activity. */
export type ActivityInput = {
  type: ActivityType
  subject: string
  body: string | null
  dueAt: string | null
  companyId: UUID | null
  contactId: UUID | null
  opportunityId: UUID | null
  caseId: UUID | null
  assetId: UUID | null
}

/** Optional timeline filters. */
export type ActivityFilters = {
  type: ActivityType | null
  status: ActivityStatus | null
}
