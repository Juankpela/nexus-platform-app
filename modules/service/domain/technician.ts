import type { UUID } from "@/types/shared"

export type TechnicianStatus = "active" | "inactive" | "on_leave"

export const TECHNICIAN_STATUSES: TechnicianStatus[] = [
  "active",
  "inactive",
  "on_leave",
]

export const TECHNICIAN_STATUS_LABELS: Record<TechnicianStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  on_leave: "En licencia",
}

export type Technician = {
  id: UUID
  firstName: string
  lastName: string
  email: string
  phone: string | null
  employeeId: string | null
  status: TechnicianStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** Fields a user may set when creating/editing a technician. */
export type TechnicianInput = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  employeeId: string | null
  status: TechnicianStatus
}

export type TechnicianFilters = {
  search: string | null
  status: TechnicianStatus | null
}

export type TechnicianSort = "name" | "recent"

/** Convenience: full display name. */
export function technicianFullName(t: Pick<Technician, "firstName" | "lastName">): string {
  return [t.firstName, t.lastName].filter(Boolean).join(" ")
}
