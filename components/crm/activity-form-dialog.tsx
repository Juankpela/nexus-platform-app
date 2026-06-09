"use client"

import { Loader2 } from "lucide-react"
import * as React from "react"
import { useActionState, useEffect, useRef, useState } from "react"

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
import {
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  type Activity,
} from "@/modules/crm/domain/activity"
import {
  createActivityAction,
  updateActivityAction,
} from "@/modules/crm/presentation/activity-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

function toInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 16) : ""
}

export function ActivityFormDialog({
  tenantSlug,
  returnPath,
  companyId,
  contactId,
  opportunityId,
  caseId,
  activity,
  trigger,
}: {
  tenantSlug: string
  returnPath: string
  companyId?: string | null
  contactId?: string | null
  opportunityId?: string | null
  caseId?: string | null
  activity?: Activity
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(activity)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateActivityAction : createActivityAction,
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  const effectiveCompanyId = activity?.companyId ?? companyId ?? ""
  const effectiveContactId = activity?.contactId ?? contactId ?? ""
  const effectiveOpportunityId =
    activity?.opportunityId ?? opportunityId ?? ""
  const effectiveCaseId = activity?.caseId ?? caseId ?? ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit activity" : "Log activity"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this activity's details."
              : "Record a call, email, meeting, task, note, or message."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="returnPath" value={returnPath} />
          <input type="hidden" name="company_id" value={effectiveCompanyId} />
          <input type="hidden" name="contact_id" value={effectiveContactId} />
          <input
            type="hidden"
            name="opportunity_id"
            value={effectiveOpportunityId}
          />
          <input type="hidden" name="case_id" value={effectiveCaseId} />
          {activity ? (
            <input type="hidden" name="id" value={activity.id} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="type" className="text-sm font-medium">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                defaultValue={activity?.type ?? "call"}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ACTIVITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="due_at" className="text-sm font-medium">
                Due
              </label>
              <Input
                id="due_at"
                name="due_at"
                type="datetime-local"
                defaultValue={toInputValue(activity?.dueAt ?? null)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject <span className="text-destructive">*</span>
            </label>
            <Input
              id="subject"
              name="subject"
              required
              maxLength={200}
              defaultValue={activity?.subject ?? ""}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="body" className="text-sm font-medium">
              Details
            </label>
            <Textarea id="body" name="body" defaultValue={activity?.body ?? ""} />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Log activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
