"use client"

import { Loader2, ThumbsUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"

import {
  acceptAssignmentAction,
  type WorkerActionState,
} from "@/modules/field-execution/presentation/worker-actions"

const initial: WorkerActionState = { error: null, ok: false }

/**
 * Botón "Aceptar" inline para el home y la agenda del técnico: deja aceptar la
 * asignación de un tap sin entrar al detalle. Reusa `acceptAssignmentAction`.
 * `block` = ancho completo y dominante (home); compacto = chip lateral (agenda).
 */
export function QuickAcceptButton({
  tenantSlug,
  assignmentId,
  variant = "block",
}: {
  tenantSlug: string
  assignmentId: string
  variant?: "block" | "compact"
}) {
  const [state, formAction, pending] = useActionState(acceptAssignmentAction, initial)
  const router = useRouter()
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  const block = variant === "block"
  return (
    <form action={formAction} className={block ? "space-y-1.5" : undefined}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <button
        type="submit"
        disabled={pending}
        className={
          block
            ? "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            : "inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        }
      >
        {pending ? (
          <Loader2 className={block ? "size-4 animate-spin" : "size-3.5 animate-spin"} />
        ) : (
          <ThumbsUp className={block ? "size-4" : "size-3.5"} />
        )}
        Aceptar
      </button>
      {state.error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
