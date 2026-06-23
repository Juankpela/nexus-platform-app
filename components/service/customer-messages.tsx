import { CalendarClock, MessageSquare, XCircle } from "lucide-react"

import { ResolveRequestButton } from "@/components/service/resolve-request-button"
import { formatDateTime } from "@/lib/format/datetime"
import {
  TRACKING_MESSAGE_LABELS,
  type CustomerTrackingMessage,
  type TrackingMessageKind,
} from "@/modules/service/domain/tracking-message"

const ICONS: Record<TrackingMessageKind, typeof MessageSquare> = {
  comment: MessageSquare,
  reschedule_request: CalendarClock,
  cancel_request: XCircle,
}

const TONES: Record<TrackingMessageKind, string> = {
  comment: "text-blue-600 dark:text-blue-400",
  reschedule_request: "text-amber-600 dark:text-amber-400",
  cancel_request: "text-destructive",
}

/**
 * Hilo de mensajes del cliente (comentarios + solicitudes de reagendar/cancelar)
 * tomados del seguimiento. En la variante del equipo (con `tenantSlug`), las
 * solicitudes abiertas muestran el botón para marcarlas atendidas.
 */
export function CustomerMessages({
  messages,
  tenantSlug,
  title = "Mensajes del cliente",
}: {
  messages: CustomerTrackingMessage[]
  /** Presente solo en superficies del equipo: habilita "Marcar atendida". */
  tenantSlug?: string
  title?: string
}) {
  if (messages.length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <ul className="space-y-3">
        {messages.map((m) => {
          const Icon = ICONS[m.kind]
          const isRequest = m.kind !== "comment"
          const open = isRequest && m.status === "open"
          return (
            <li key={m.id} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 size-4 shrink-0 ${TONES[m.kind]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {TRACKING_MESSAGE_LABELS[m.kind]}
                  </span>
                  {isRequest ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        open
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {open ? "Pendiente" : "Atendida"}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>
                {m.preferredAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Prefiere: <span className="text-foreground">{formatDateTime(m.preferredAt)}</span>
                  </p>
                ) : null}
                {m.body ? <p className="mt-0.5 text-foreground">{m.body}</p> : null}
                {open && tenantSlug && m.workOrderId ? (
                  <div className="mt-1.5">
                    <ResolveRequestButton
                      tenantSlug={tenantSlug}
                      id={m.id}
                      workOrderId={m.workOrderId}
                    />
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
