"use client"

import { CalendarClock, Check, Loader2, MessageSquare, XCircle } from "lucide-react"
import { useActionState, useState } from "react"

import {
  submitCancelRequestAction,
  submitCommentAction,
  submitRescheduleRequestAction,
  type TrackingMessageState,
} from "@/modules/service/presentation/public-tracking-actions"

const initial: TrackingMessageState = { ok: false, error: null }

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

/** Campo trampa anti-bot (oculto); los humanos no lo llenan. */
function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      className="hidden"
    />
  )
}

function Feedback({ state, okText }: { state: TrackingMessageState; okText: string }) {
  if (state.ok) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="size-3.5" /> {okText}
      </p>
    )
  }
  if (state.error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {state.error}
      </p>
    )
  }
  return null
}

/**
 * Acciones del cliente en el seguimiento: dejar un comentario para su técnico,
 * solicitar reagendar o solicitar cancelar. No mutan la operación — quedan como
 * solicitud para el coordinador. Sin login: el token viaja en cada formulario.
 */
export function TrackingCustomerActions({ token }: { token: string }) {
  const [comment, commentAction, commentPending] = useActionState(submitCommentAction, initial)
  const [reschedule, rescheduleAction, reschedulePending] = useActionState(
    submitRescheduleRequestAction,
    initial,
  )
  const [cancel, cancelAction, cancelPending] = useActionState(submitCancelRequestAction, initial)

  const [openReschedule, setOpenReschedule] = useState(false)
  const [openCancel, setOpenCancel] = useState(false)

  return (
    <div className="mt-6 space-y-4 border-t pt-6">
      <p className="text-sm font-semibold text-foreground">¿Necesitas algo más?</p>

      {/* Comentario al técnico */}
      <form action={commentAction} className="space-y-2">
        <Honeypot />
        <input type="hidden" name="token" value={token} />
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MessageSquare className="size-3.5" /> Comentario para tu técnico
        </label>
        <textarea
          name="body"
          rows={2}
          maxLength={2000}
          placeholder="Ej: el portón está abierto, pregunta por el vigilante…"
          className={inputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <Feedback state={comment} okText="¡Enviado! Tu técnico lo verá." />
          <button
            type="submit"
            disabled={commentPending}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {commentPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar comentario
          </button>
        </div>
      </form>

      {/* Reagendar / Cancelar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setOpenReschedule((v) => !v)
            setOpenCancel(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <CalendarClock className="size-4" /> Solicitar reagendar
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenCancel((v) => !v)
            setOpenReschedule(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <XCircle className="size-4" /> Solicitar cancelar
        </button>
      </div>

      {openReschedule ? (
        <form action={rescheduleAction} className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <Honeypot />
          <input type="hidden" name="token" value={token} />
          <p className="text-xs text-muted-foreground">
            Cuéntanos cuándo te queda mejor. El coordinador confirmará la nueva visita.
          </p>
          <label className="block text-xs font-medium text-muted-foreground">
            Fecha y hora preferida (opcional)
            <input type="datetime-local" name="preferred_at" className={`mt-1 ${inputClass}`} />
          </label>
          <textarea
            name="body"
            rows={2}
            maxLength={2000}
            placeholder="Motivo o detalle (opcional)"
            className={inputClass}
          />
          <div className="flex items-center justify-between gap-2">
            <Feedback state={reschedule} okText="Solicitud enviada. Te contactaremos." />
            <button
              type="submit"
              disabled={reschedulePending}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {reschedulePending ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar solicitud
            </button>
          </div>
        </form>
      ) : null}

      {openCancel ? (
        <form action={cancelAction} className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3">
          <Honeypot />
          <input type="hidden" name="token" value={token} />
          <p className="text-xs text-muted-foreground">
            Dinos por qué quieres cancelar. El coordinador revisará tu solicitud.
          </p>
          <textarea
            name="body"
            rows={2}
            maxLength={2000}
            required
            placeholder="Motivo de la cancelación"
            className={inputClass}
          />
          <div className="flex items-center justify-between gap-2">
            <Feedback state={cancel} okText="Solicitud enviada. Te contactaremos." />
            <button
              type="submit"
              disabled={cancelPending}
              className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-60"
            >
              {cancelPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Enviar solicitud
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
