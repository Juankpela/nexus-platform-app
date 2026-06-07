"use client"

import { Loader2, Plus } from "lucide-react"
import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createOrganizationAction,
  type PlatformActionState,
} from "@/modules/platform/presentation/platform-actions"

const initialState: PlatformActionState = { error: null, ok: false }

function Field({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </label>
  )
}

export function CreateOrganizationForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(
    createOrganizationAction,
    initialState,
  )

  useEffect(() => {
    // Collapse the form once the server action confirms success.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.ok) setOpen(false)
  }, [state.ok])

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="size-4" />
        Nueva organización
      </Button>
    )
  }

  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Nueva organización</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Crea el espacio de trabajo y su primer administrador con una contraseña
        temporal que deberás entregarle.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <Field
          label="Nombre de la organización"
          name="organizationName"
          placeholder="Huella Global"
        />
        <Field
          label="Identificador (slug)"
          name="slug"
          placeholder="huella-global"
        />
        <div className="h-px bg-border" />
        <Field
          label="Nombre del administrador"
          name="adminFullName"
          required={false}
          placeholder="Juan Pelaez"
        />
        <Field
          label="Email del administrador"
          name="adminEmail"
          type="email"
          placeholder="admin@huellaglobal.com"
        />
        <Field
          label="Contraseña temporal"
          name="adminPassword"
          type="text"
          placeholder="mínimo 8 caracteres"
        />

        {state.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear organización
          </Button>
        </div>
      </form>
    </div>
  )
}
