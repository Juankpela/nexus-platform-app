"use client"

import { Loader2, Mail } from "lucide-react"
import { useActionState, useState } from "react"

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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type SendEmailState = { ok: boolean; error: string | null }
const initial: SendEmailState = { ok: false, error: null }

type Action = (state: SendEmailState, formData: FormData) => Promise<SendEmailState>

/**
 * Generic "send by email" modal reused by quotes and invoices. Prefilled
 * recipient/subject/message; attaches the document PDF server-side. Manual send
 * only — the user reviews and confirms each email.
 */
export function SendDocumentEmailDialog({
  tenantSlug,
  documentId,
  defaultTo,
  defaultSubject,
  defaultMessage,
  action,
  trigger,
}: {
  tenantSlug: string
  documentId: string
  defaultTo: string
  defaultSubject: string
  defaultMessage: string
  action: Action
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(action, initial)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar por email</DialogTitle>
          <DialogDescription>
            Se adjunta automáticamente el PDF. Revisa el destinatario antes de enviar.
          </DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Correo enviado correctamente.
            </p>
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cerrar</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="document_id" value={documentId} />

            <div className="space-y-1.5">
              <label htmlFor="to" className="text-sm font-medium">Destinatario</label>
              <Input id="to" name="to" type="email" required defaultValue={defaultTo} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="subject" className="text-sm font-medium">Asunto</label>
              <Input id="subject" name="subject" required defaultValue={defaultSubject} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="message" className="text-sm font-medium">Mensaje</label>
              <Textarea id="message" name="message" rows={5} defaultValue={defaultMessage} />
            </div>

            {state.error ? (
              <p role="alert" className="text-sm text-destructive">{state.error}</p>
            ) : null}

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Enviar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
