import type { UUID } from "@/types/shared"

/**
 * Interacciones que el cliente origina desde la página pública de seguimiento:
 * un comentario para su técnico o una solicitud de reagendar/cancelar. Son
 * append-only y no mutan la operación — el coordinador las resuelve.
 */
export const TRACKING_MESSAGE_KINDS = [
  "comment",
  "reschedule_request",
  "cancel_request",
] as const

export type TrackingMessageKind = (typeof TRACKING_MESSAGE_KINDS)[number]

export const TRACKING_MESSAGE_LABELS: Record<TrackingMessageKind, string> = {
  comment: "Comentario del cliente",
  reschedule_request: "Solicitud de reagendar",
  cancel_request: "Solicitud de cancelar",
}

export type TrackingMessageStatus = "open" | "resolved"

export type CustomerTrackingMessage = {
  id: UUID
  kind: TrackingMessageKind
  body: string | null
  /** Fecha/hora preferida por el cliente al pedir reagendar (ISO) o null. */
  preferredAt: string | null
  status: TrackingMessageStatus
  createdAt: string
  workOrderId: UUID | null
}

/** Una solicitud (reagendar/cancelar) abierta requiere decisión del coordinador. */
export function isOpenRequest(m: CustomerTrackingMessage): boolean {
  return m.kind !== "comment" && m.status === "open"
}
