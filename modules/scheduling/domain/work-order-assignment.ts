import type { UUID } from "@/types/shared"

export type AssignmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: "Programada",
  in_progress: "En ejecución",
  completed: "Completada",
  cancelled: "Cancelada",
}

/** Statuses that block a technician's time (used for overlap detection). */
export const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  "scheduled",
  "in_progress",
]

export type WorkOrderAssignment = {
  id: UUID
  workOrderId: UUID
  workOrderNumber: string | null
  workOrderSubject: string | null
  technicianId: UUID
  technicianName: string | null
  scheduledStart: string
  scheduledEnd: string
  estimatedDurationMinutes: number
  status: AssignmentStatus
  createdAt: string
  updatedAt: string
}

export type AssignmentInput = {
  workOrderId: UUID
  technicianId: UUID
  scheduledStart: string
  scheduledEnd: string
}

export type AssignmentFilters = {
  technicianId: UUID | null
  status: AssignmentStatus | null
  /** Inclusive scheduled_start range (ISO). */
  dateFrom: string | null
  dateTo: string | null
}

/**
 * Pure half-open interval overlap test: [aStart, aEnd) vs [bStart, bEnd).
 * Touching edges do NOT overlap (09:00-11:00 and 11:00-12:00 are fine).
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime()
  )
}

/** Whole-minute duration between two ISO instants. */
export function durationMinutes(start: string, end: string): number {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  )
}
