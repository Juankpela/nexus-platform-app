"use client"

import { CheckCircle2, Loader2, MapPin, Play, ThumbsUp, XCircle } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
          <Textarea
            name="unable_reason"
            placeholder="Motivo (cliente ausente, sin acceso, falta material…)"
            rows={2}
          />
        </ActionForm>
      ) : null}
    </div>
  )
}
