"use client"

import { Loader2 } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  updateMemberRolesAction,
  type MemberActionState,
} from "@/modules/tenancy/presentation/member-actions"

const initialState: MemberActionState = { error: null, ok: false }

export type RoleOption = { id: string; name: string }

export function MemberRolesEditor({
  tenantSlug,
  membershipId,
  roleOptions,
  assignedRoleIds,
}: {
  tenantSlug: string
  membershipId: string
  roleOptions: RoleOption[]
  assignedRoleIds: string[]
}) {
  const [state, action, pending] = useActionState(
    updateMemberRolesAction,
    initialState,
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {roleOptions.map((role) => (
          <label
            key={role.id}
            className="flex items-center gap-1.5 text-sm text-foreground"
          >
            <input
              type="checkbox"
              name="roleIds"
              value={role.id}
              defaultChecked={assignedRoleIds.includes(role.id)}
              className="size-3.5 rounded border-input accent-primary"
            />
            {role.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save roles
        </Button>
        {state.error ? (
          <span role="alert" className="text-xs text-destructive">
            {state.error}
          </span>
        ) : null}
        {state.ok ? (
          <span className="text-xs text-muted-foreground">Saved.</span>
        ) : null}
      </div>
    </form>
  )
}
