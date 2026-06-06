"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  updateMemberStatusAction,
  type MemberActionState,
} from "@/modules/tenancy/presentation/member-actions"

const initialState: MemberActionState = { error: null, ok: false }

export function MemberStatusToggle({
  tenantSlug,
  membershipId,
  status,
}: {
  tenantSlug: string
  membershipId: string
  status: "invited" | "active" | "suspended"
}) {
  const [state, action, pending] = useActionState(
    updateMemberStatusAction,
    initialState,
  )
  const nextStatus = status === "active" ? "suspended" : "active"

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button
        type="submit"
        size="sm"
        variant={status === "active" ? "outline" : "default"}
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : null}
        {status === "active" ? "Suspend" : "Activate"}
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
