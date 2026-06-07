"use client"

import { UserPlus } from "lucide-react"
import { useActionState, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createTenantMemberAction } from "@/modules/tenancy/presentation/member-actions"
import type { AssignableRole } from "@/modules/tenancy/domain/member"

type Props = {
  tenantSlug: string
  roleOptions: Pick<AssignableRole, "id" | "name">[]
}

/**
 * Self-contained "Agregar usuario" button + dialog. The inner form component
 * remounts when the dialog opens (via conditional render), which resets the
 * useActionState to its initial value automatically.
 */
export function CreateMemberDialog({ tenantSlug, roleOptions }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 size-4" />
          Agregar usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar usuario</DialogTitle>
          <DialogDescription>
            Crea una cuenta y agrégala a este workspace. El usuario podrá iniciar
            sesión con la contraseña temporal que asignes.
          </DialogDescription>
        </DialogHeader>

        {/* Conditional render ensures useActionState resets on each open */}
        {open && (
          <CreateMemberForm
            tenantSlug={tenantSlug}
            roleOptions={roleOptions}
            onSuccess={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CreateMemberForm({
  tenantSlug,
  roleOptions,
  onSuccess,
}: Props & { onSuccess: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createTenantMemberAction,
    { error: null, ok: false },
  )

  // onSuccess is stable (inline function from parent), use ref to avoid dep
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  useEffect(() => {
    if (state.ok) onSuccessRef.current()
  }, [state.ok])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div className="space-y-1.5">
        <label
          htmlFor="cm-fullName"
          className="text-sm font-medium text-foreground"
        >
          Nombre completo
        </label>
        <Input
          id="cm-fullName"
          name="fullName"
          placeholder="Ana García"
          required
          minLength={1}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cm-email"
          className="text-sm font-medium text-foreground"
        >
          Correo electrónico
        </label>
        <Input
          id="cm-email"
          name="email"
          type="email"
          placeholder="ana@empresa.com"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="cm-password"
          className="text-sm font-medium text-foreground"
        >
          Contraseña temporal
        </label>
        <Input
          id="cm-password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
          disabled={isPending}
          autoComplete="new-password"
        />
      </div>

      {roleOptions.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Roles
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="checkbox"
                  name="roleIds"
                  value={role.id}
                  disabled={isPending}
                  className="accent-primary"
                />
                {role.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creando usuario…" : "Crear usuario"}
      </Button>
    </form>
  )
}
