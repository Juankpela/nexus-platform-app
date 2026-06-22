"use client"

import { Camera, CheckCircle2, Loader2, MapPin, MessageCircle, Play, Send, ThumbsUp, X, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  NON_COMPLETION_REASONS,
  NON_COMPLETION_REASON_LABELS,
} from "@/modules/field-execution/domain/disposition"
import type { ExecutionStatus } from "@/modules/field-execution/domain/execution"
import {
  acceptAssignmentAction,
  arriveOnSiteAction,
  completeWorkAction,
  notifyEnRouteAction,
  reportUnableAction,
  startWorkAction,
  type WorkerActionState,
} from "@/modules/field-execution/presentation/worker-actions"

const initial: WorkerActionState = { error: null, ok: false }

/** Compresión en cliente con canvas nativo (mismo enfoque que el intake). */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode"))
      img.onload = () => {
        const max = 1024
        let { width, height } = img
        if (width > height && width > max) {
          height = Math.round((height * max) / width)
          width = max
        } else if (height > max) {
          width = Math.round((width * max) / height)
          height = max
        }
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("ctx"))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.55))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Captura de foto de evidencia para el cierre (reusa bucket reports vía action). */
function EvidencePhoto() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus("loading")
    try {
      setPhoto(await compressImage(file))
      setStatus("idle")
    } catch {
      setPhoto(null)
      setStatus("error")
    }
  }

  return (
    <div>
      <input type="hidden" name="photo" value={photo ?? ""} />
      {photo ? (
        <div className="flex items-center gap-3">
          {/* data: URL local; CSP permite img-src data:. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Evidencia" className="size-16 rounded-lg border object-cover" />
          <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
            <X className="mr-1 size-4" /> Quitar
          </Button>
        </div>
      ) : (
        <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm text-muted-foreground hover:bg-muted/40">
          {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Tomar foto de evidencia
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
        </label>
      )}
      {status === "error" ? (
        <p className="mt-1 text-xs text-muted-foreground">No pudimos procesar la imagen. Intenta otra.</p>
      ) : null}
    </div>
  )
}

type Action = (s: WorkerActionState, fd: FormData) => Promise<WorkerActionState>

function ActionForm({
  action,
  tenantSlug,
  assignmentId,
  label,
  icon: Icon,
  emphasis = "primary",
  successLabel,
  children,
  afterSuccess,
}: {
  action: Action
  tenantSlug: string
  assignmentId: string
  label: string
  icon: typeof Play
  /** "primary" = acción DOMINANTE de la pantalla; "secondary" = subordinada. */
  emphasis?: "primary" | "secondary"
  successLabel?: string
  children?: React.ReactNode
  /** Contenido que aparece bajo el botón al completarse la acción (ej. avisar al cliente). */
  afterSuccess?: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  const router = useRouter()
  const primary = emphasis === "primary"
  // Al completarse la acción, refrescamos el RSC para que la pantalla avance al
  // siguiente paso de la misión sin que el técnico tenga que recargar a mano.
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      {children}
      <Button
        type="submit"
        size="lg"
        variant={primary ? "default" : "outline"}
        className={primary ? "h-14 w-full text-base font-semibold" : "w-full"}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Icon className="size-4" />}
        {label}
      </Button>
      {state.error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok && successLabel ? (
        <p className="text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {successLabel}
        </p>
      ) : null}
      {state.ok && afterSuccess ? afterSuccess : null}
    </form>
  )
}

/**
 * Botón contextual "avisar al cliente por WhatsApp" — aparece en el paso exacto de
 * la operación (al salir, al llegar, al completar) con el mensaje correcto ya
 * armado en el servidor. El técnico no tiene que elegir entre varios avisos ni
 * bajar a la línea de vida: el botón que toca está justo donde acaba de actuar.
 */
function WhatsAppCta({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <p className="rounded-lg border border-dashed bg-muted/30 p-2.5 text-center text-xs text-muted-foreground">
        Sin número de WhatsApp del cliente para avisarle.
      </p>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
    >
      <MessageCircle className="size-4" />
      {label}
    </a>
  )
}

/**
 * Decisión de facturación que toma el técnico al cerrar. "Sí" deja la orden lista
 * para facturar; "No" la finaliza como cierre administrativo. Se envía en el campo
 * `billable` ("true"/"false") del mismo formulario de cierre.
 */
function BillableChoice() {
  const [billable, setBillable] = useState(true)
  return (
    <fieldset className="rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium text-foreground">
        ¿Este servicio es facturable?
      </legend>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {[
          { value: true, label: "Sí, facturar" },
          { value: false, label: "No facturar" },
        ].map((opt) => {
          const active = billable === opt.value
          return (
            <label
              key={String(opt.value)}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-input text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="billable"
                value={String(opt.value)}
                checked={active}
                onChange={() => setBillable(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {billable
          ? "La orden quedará lista para facturar."
          : "La orden se finaliza sin factura y queda en los registros como completada."}
      </p>
    </fieldset>
  )
}

/**
 * Captura PUNTUAL de la ubicación del técnico al salir hacia el cliente. Una sola
 * lectura (`getCurrentPosition`) cuando aparece la pantalla "Voy en camino" — sin
 * `watchPosition`, sin tracking en segundo plano, sin polling. NEXUS coordina, no
 * rastrea. Rellena hidden inputs que la acción `notifyEnRouteAction` guarda en la
 * auditoría para alimentar el ETA (Fase 3). Si el técnico niega el permiso, el
 * aviso se envía igual (sin ETA): la operación nunca se bloquea por geolocalización.
 */
/** Lectura ÚNICA de alta precisión — sin `watchPosition`, sin caché de posición. */
const GEO_OPTS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }

function EnRouteCapture() {
  const [snap, setSnap] = useState<
    { lat: number; lng: number; accuracy: number; capturedAt: string } | null
  >(null)
  const [status, setStatus] = useState<
    "locating" | "ready" | "denied" | "unavailable"
  >("locating")

  // Callbacks asíncronos de la Geolocation API: sus setState no son síncronos al
  // efecto, así que no provocan renders en cascada.
  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setSnap({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      capturedAt: new Date().toISOString(),
    })
    setStatus("ready")
  }, [])
  const onError = useCallback((err: GeolocationPositionError) => {
    setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable")
  }, [])

  // Reintento manual (event handler, no efecto): aquí sí podemos resetear estado.
  const capture = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable")
      return
    }
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS)
  }, [onSuccess, onError])

  // Se dispara al montar la acción dominante (pantalla "accepted"): para cuando el
  // técnico pulse "Voy en camino", la ubicación ya está lista sin pasos extra. El
  // efecto solo lanza la lectura asíncrona — sin setState síncrono.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(onSuccess, onError, GEO_OPTS)
  }, [onSuccess, onError])

  const failed = status === "denied" || status === "unavailable"

  return (
    <div className="rounded-lg border border-input bg-muted/30 p-2.5 text-xs">
      <input type="hidden" name="tech_lat" value={snap?.lat ?? ""} />
      <input type="hidden" name="tech_lng" value={snap?.lng ?? ""} />
      <input type="hidden" name="tech_accuracy" value={snap?.accuracy ?? ""} />
      <input type="hidden" name="captured_at" value={snap?.capturedAt ?? ""} />
      {status === "locating" ? (
        <span className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Obteniendo tu ubicación…
        </span>
      ) : null}
      {status === "ready" && snap ? (
        <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <MapPin className="size-3.5" /> Ubicación lista · precisión ±
          {Math.round(snap.accuracy)} m
        </span>
      ) : null}
      {failed ? (
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin className="size-3.5" />
            {status === "denied"
              ? "Sin permiso de ubicación · el aviso se enviará sin ETA"
              : "Ubicación no disponible · el aviso se enviará sin ETA"}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={capture}>
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Enlaces wa.me por momento (armados en el servidor con `notifyLinks`). */
export type NotifyLinks = {
  confirm: string | null
  enRoute: string | null
  arrived: string | null
  completed: string | null
}

export function ExecutionActions({
  tenantSlug,
  assignmentId,
  status,
  etaSelector = null,
  notify = null,
}: {
  tenantSlug: string
  assignmentId: string
  status: ExecutionStatus
  /**
   * SEAM de ETA (FASE 2/3): selector 15/30/45/60 que se monta dentro del
   * formulario de "Voy en camino". Hoy nadie lo pasa → la estructura está lista
   * pero invisible. NO depende de la base de datos aún.
   */
  etaSelector?: React.ReactNode
  /**
   * Enlaces de WhatsApp por momento. Cuando se pasan, cada paso de la operación
   * muestra el aviso al cliente que corresponde (salir, llegar, completar) sin que
   * el técnico tenga que bajar a la línea de vida ni elegir el mensaje equivocado.
   */
  notify?: NotifyLinks | null
}) {
  const common = { tenantSlug, assignmentId }
  const [showUnable, setShowUnable] = useState(false)

  if (status === "completed") {
    return (
      <div className="space-y-3">
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ Trabajo completado
        </p>
        {notify ? (
          <WhatsAppCta url={notify.completed} label="Avisar al cliente: trabajo completado" />
        ) : null}
      </div>
    )
  }
  if (status === "unable_to_complete") {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        No se pudo completar — reportado al despachador
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* UNA acción dominante por pantalla (el siguiente paso de la misión). */}
      {status === "pending" ? (
        <ActionForm {...common} action={acceptAssignmentAction} label="Aceptar asignación" icon={ThumbsUp} />
      ) : null}

      {status === "accepted" ? (
        <>
          {/* Dominante: salir hacia el cliente (avisa al cliente; acción lateral
              que NO cambia el estado de ejecución). El selector de ETA (FASE 3)
              se monta aquí dentro cuando exista. */}
          <ActionForm
            {...common}
            action={notifyEnRouteAction}
            label="Voy en camino"
            icon={Send}
            successLabel="✓ En camino"
            afterSuccess={
              notify ? (
                <WhatsAppCta url={notify.enRoute} label="Avisar al cliente: voy en camino" />
              ) : null
            }
          >
            <EnRouteCapture />
            {etaSelector}
          </ActionForm>
          {/* Subordinada: ya llegué (para cuando esté en el sitio). */}
          <ActionForm
            {...common}
            action={arriveOnSiteAction}
            label="Ya llegué al sitio"
            icon={MapPin}
            emphasis="secondary"
          />
        </>
      ) : null}

      {status === "on_site" ? (
        <>
          {/* Al llegar, el aviso al cliente se ofrece de una (paso recién dado). */}
          {notify ? (
            <WhatsAppCta url={notify.arrived} label="Avisar al cliente: llegué al sitio" />
          ) : null}
          <ActionForm {...common} action={startWorkAction} label="Iniciar trabajo" icon={Play} />
        </>
      ) : null}

      {status === "working" ? (
        <ActionForm {...common} action={completeWorkAction} label="Finalizar orden" icon={CheckCircle2}>
          <Textarea
            name="resolution_notes"
            placeholder="Resumen del trabajo realizado (opcional)"
            rows={3}
          />
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">Evidencia del trabajo</p>
            <EvidencePhoto />
          </div>
          <BillableChoice />
        </ActionForm>
      ) : null}

      {/* "No puedo completar" como salida DISCRETA (no compite con la dominante):
          un enlace que despliega el formulario solo cuando se necesita. */}
      {status === "accepted" || status === "on_site" || status === "working" ? (
        <div className="pt-1">
          {showUnable ? (
            <div className="rounded-xl border border-dashed p-3">
              <ActionForm
                {...common}
                action={reportUnableAction}
                label="Reportar que no se pudo completar"
                icon={XCircle}
                emphasis="secondary"
              >
                <select
                  name="non_completion_reason"
                  defaultValue="customer_absent"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  aria-label="Motivo de no completar"
                >
                  {NON_COMPLETION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {NON_COMPLETION_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Textarea
                  name="unable_reason"
                  placeholder="Detalle adicional (opcional)"
                  rows={2}
                />
              </ActionForm>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUnable(true)}
              className="mx-auto block text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              No puedo completar este trabajo
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
