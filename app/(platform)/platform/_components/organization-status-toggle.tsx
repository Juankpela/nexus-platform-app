"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  setOrganizationStatusAction,
  type PlatformActionState,
} from "@/modules/platform/presentation/platform-actions"

const initialState: PlatformActionState = { error: null, ok: false }

export function OrganizationStatusToggle({
  tenantId,
  status,
}: {
  tenantId: string
  status: "active" | "suspended"
}) {
  const [state, action, pending] = useActionState(
    setOrganizationStatusAction,
    initialState,
  )
  const nextStatus = status === "active" ? "suspended" : "active"

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button
        type="submit"
        size="sm"
        variant={status === "active" ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {status === "active" ? "Suspender" : "Reactivar"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
