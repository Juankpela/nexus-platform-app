"use client"

import { CheckCircle2, Loader2, Send } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  submitReportAction,
  type PublicReportState,
} from "@/modules/service/presentation/public-intake-actions"

const initial: PublicReportState = { ok: false, error: null }

const CATEGORIES = [
  "Eléctrico",
  "Plomería / Hidráulico",
  "Estructura / Civil",
  "Aseo / Limpieza",
  "Seguridad",
  "Otro",
]

const labelCls = "text-sm font-medium text-foreground"
const fieldCls = "mt-1.5"

export function PublicReportForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, formAction, pending] = useActionState(submitReportAction, initial)

  if (state.ok) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Reporte recibido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guarda tu folio para hacer seguimiento.
        </p>
        <p className="mt-4 inline-block rounded-lg bg-muted px-4 py-2 text-base font-semibold tabular-nums">
          Folio: {state.folio}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="rounded-2xl border bg-card p-6 sm:p-8">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      {/* Honeypot — oculto para humanos, lo llenan los bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4">
        <div>
          <label htmlFor="description" className={labelCls}>¿Qué ocurrió?</label>
          <Textarea id="description" name="description" required rows={3} className={fieldCls} placeholder="Describe la novedad o el daño" />
        </div>
        <div>
          <label htmlFor="location" className={labelCls}>¿Dónde ocurrió?</label>
          <Input id="location" name="location" required className={fieldCls} placeholder="Sede, escenario, dirección o área" />
        </div>
        <div>
          <label htmlFor="category" className={labelCls}>Categoría</label>
          <select
            id="category"
            name="category"
            defaultValue={CATEGORIES[0]}
            className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reporterName" className={labelCls}>Nombre</label>
            <Input id="reporterName" name="reporterName" required className={fieldCls} placeholder="Tu nombre" />
          </div>
          <div>
            <label htmlFor="reporterPhone" className={labelCls}>WhatsApp</label>
            <Input id="reporterPhone" name="reporterPhone" className={fieldCls} placeholder="Opcional, para avisarte" />
          </div>
        </div>

        {!state.ok && state.error ? (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
          Enviar reporte
        </Button>
      </div>
    </form>
  )
}
