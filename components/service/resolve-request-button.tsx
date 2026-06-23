"use client"

import { Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"

import { resolveTrackingMessageAction } from "@/modules/service/presentation/tracking-message-actions"
import type { ServiceActionState } from "@/modules/service/presentation/require-service-context"

const initial: ServiceActionState = { error: null, ok: false }

/** Marca una solicitud del cliente como atendida (coordinador). */
export function ResolveRequestButton({
  tenantSlug,
  id,
  workOrderId,
}: {
  tenantSlug: string
  id: string
  workOrderId: string
}) {
  const [state, formAction, pending] = useActionState(resolveTrackingMessageAction, initial)
  const router = useRouter()
  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Marcar atendida
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
