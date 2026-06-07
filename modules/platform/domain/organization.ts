import type { UUID } from "@/types/shared"

// An "organization" on the platform plane is the customer Nexus sells to.
// Canonically it is a tenant row; "organization" is the business-facing term.

export const ORGANIZATION_STATUSES = [
  "active",
  "suspended",
  "archived",
] as const

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
  active: "Activa",
  suspended: "Suspendida",
  archived: "Archivada",
}

export const ORGANIZATION_STATUS_COLORS: Record<OrganizationStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  suspended: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
}

export type Organization = {
  id: UUID
  slug: string
  name: string
  status: OrganizationStatus
  memberCount: number
  createdAt: string
}

/** Slug rule mirrors the DB CHECK on tenants.slug. */
export const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
