"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/modules/crm/domain/lead"
import { createLeadAction } from "@/modules/crm/presentation/lead-actions"

export function LeadCreateButton({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    start(async () => {
      const r = await createLeadAction(tenantSlug, { ok: false, error: null }, formData)
      if (r.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(r.error)
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo lead
      </Button>
    )
  }

  return (
    <form
      action={onSubmit}
      className="w-full space-y-3 rounded-xl border bg-card p-4"
    >
      <h2 className="text-sm font-semibold">Nuevo lead</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Nombre *</span>
          <Input name="name" required className="h-9" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Empresa</span>
          <Input name="company" className="h-9" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Email</span>
          <Input name="email" type="email" className="h-9" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Teléfono</span>
          <Input name="phone" className="h-9" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Fuente</span>
          <select
            name="source"
            defaultValue="web"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Notas</span>
          <Input name="notes" className="h-9" />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
