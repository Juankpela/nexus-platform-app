"use client"

import { Check, Loader2, X } from "lucide-react"
import { useActionState } from "react"

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
  decideQuoteByTokenAction,
  type PublicDecisionState,
} from "@/modules/crm/presentation/public-quote-actions"

const initial: PublicDecisionState = { ok: false, error: null }

function ConfirmButton({
  token,
  decision,
  label,
  variant,
  icon,
  title,
  description,
  state,
  formAction,
  pending,
}: {
  token: string
  decision: "approve" | "reject"
  label: string
  variant: "default" | "outline"
  icon: React.ReactNode
  title: string
  description: string
  state: PublicDecisionState
  formAction: (formData: FormData) => void
  pending: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size="lg">
          {icon}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="decision" value={decision} />
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

export function ApprovalActions({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(decideQuoteByTokenAction, initial)

  if (state.ok) {
    return (
      <div className="rounded-lg border bg-emerald-500/5 p-4 text-center">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          ¡Gracias! Tu respuesta quedó registrada.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes cerrar esta página.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ConfirmButton
        token={token}
        decision="approve"
        label="Aprobar"
        variant="default"
        icon={<Check className="size-4" />}
        title="Aprobar cotización"
        description="Confirmas que apruebas esta cotización. Esto no se puede deshacer."
        state={state}
        formAction={formAction}
        pending={pending}
      />
      <ConfirmButton
        token={token}
        decision="reject"
        label="Rechazar"
        variant="outline"
        icon={<X className="size-4" />}
        title="Rechazar cotización"
        description="Confirmas que rechazas esta cotización. Esto no se puede deshacer."
        state={state}
        formAction={formAction}
        pending={pending}
      />
    </div>
  )
}
