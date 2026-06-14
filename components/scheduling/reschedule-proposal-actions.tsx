"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  applyRescheduleSameTechAction,
  applyRescheduleSuggestedAction,
} from "@/modules/scheduling/presentation/scheduling-actions"
import type { SchedulingActionState } from "@/modules/scheduling/presentation/require-scheduling-context"

const initial: SchedulingActionState = { error: null, ok: false }

type Action = (s: SchedulingActionState, fd: FormData) => Promise<SchedulingActionState>

function ConfirmAction({
  label,
  variant,
  action,
  title,
  description,
  tenantSlug,
  workOrderId,
}: {
  label: string
  variant: "default" | "outline"
  action: Action
  title: string
  description: string
  tenantSlug: string
  workOrderId: string
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(action, initial)
  const seen = useRef(false)
  useEffect(() => {
    if (state.ok && !seen.current) {
      seen.current = true
      router.refresh()
    }
    if (!state.ok) seen.current = false
  }, [state.ok, router])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant={variant}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="work_order_id" value={workOrderId} />
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Human-triggered reschedule (ADR-032): two confirmed actions on a proposal.
 * Writes via the scheduling aggregate; the cron stays dry-run.
 */
export function RescheduleProposalActions({
  tenantSlug,
  workOrderId,
  technicianName,
  slotLabel,
}: {
  tenantSlug: string
  workOrderId: string
  technicianName: string | null
  slotLabel: string
}) {
  return (
    <div className="flex gap-2">
      <ConfirmAction
        label="Reagendar"
        variant="default"
        action={applyRescheduleSameTechAction}
        title="Reagendar (mismo técnico)"
        description={`Se reagendará con ${technicianName ?? "el mismo técnico"} al próximo hueco (${slotLabel}). Se actualizará la asignación.`}
        tenantSlug={tenantSlug}
        workOrderId={workOrderId}
      />
      <ConfirmAction
        label="Técnico sugerido"
        variant="outline"
        action={applyRescheduleSuggestedAction}
        title="Reagendar con técnico sugerido"
        description="El sistema elegirá el mejor técnico elegible (disponible, sin solape) para ese horario y reagendará con él. Nota: aún no filtra por habilidad."
        tenantSlug={tenantSlug}
        workOrderId={workOrderId}
      />
    </div>
  )
}
