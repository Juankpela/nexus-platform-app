"use client"

import { Camera, CheckCircle2, Loader2, MapPin, Play, ThumbsUp, X, XCircle } from "lucide-react"
import { useActionState, useState } from "react"

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
  variant = "default",
  children,
}: {
  action: Action
  tenantSlug: string
  assignmentId: string
  label: string
  icon: typeof Play
  variant?: "default" | "outline"
  children?: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, initial)
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      {children}
      <Button type="submit" size="lg" variant={variant} className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Icon className="size-4" />}
        {label}
      </Button>
      {state.error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

export function ExecutionActions({
  tenantSlug,
  assignmentId,
  status,
}: {
  tenantSlug: string
  assignmentId: string
  status: ExecutionStatus
}) {
  const common = { tenantSlug, assignmentId }

  if (status === "completed") {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        ✓ Trabajo completado
      </p>
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
      {status === "pending" ? (
        <ActionForm {...common} action={acceptAssignmentAction} label="Aceptar asignación" icon={ThumbsUp} />
      ) : null}

      {status === "accepted" ? (
        <ActionForm {...common} action={arriveOnSiteAction} label="Llegué al sitio" icon={MapPin} />
      ) : null}

      {status === "on_site" ? (
        <ActionForm {...common} action={startWorkAction} label="Iniciar trabajo" icon={Play} />
      ) : null}

      {status === "working" ? (
        <ActionForm {...common} action={completeWorkAction} label="Completar trabajo" icon={CheckCircle2}>
          <Textarea
            name="resolution_notes"
            placeholder="Resumen del trabajo realizado (opcional)"
            rows={3}
          />
          <EvidencePhoto />
        </ActionForm>
      ) : null}

      {/* Unable-to-complete available while the work is open */}
      {status === "accepted" || status === "on_site" || status === "working" ? (
        <ActionForm
          {...common}
          action={reportUnableAction}
          label="No puedo completar"
          icon={XCircle}
          variant="outline"
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
      ) : null}
    </div>
  )
}
