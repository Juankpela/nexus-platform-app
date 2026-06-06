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
import type { CompanyOption } from "@/modules/crm/domain/company"
import type { ContactOption } from "@/modules/crm/domain/contact"
import {
  OPPORTUNITY_BUSINESS_TYPES,
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
  type Opportunity,
} from "@/modules/crm/domain/opportunity"
import {
  createOpportunityAction,
  updateOpportunityAction,
} from "@/modules/crm/presentation/opportunity-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export type OwnerOption = { id: string; label: string }

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  )
}

export function OpportunityFormDialog({
  tenantSlug,
  companyOptions,
  contactOptions,
  ownerOptions,
  opportunity,
  trigger,
}: {
  tenantSlug: string
  companyOptions: CompanyOption[]
  contactOptions: ContactOption[]
  ownerOptions: OwnerOption[]
  opportunity?: Opportunity
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(opportunity)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateOpportunityAction : createOpportunityAction,
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit opportunity" : "New opportunity"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this opportunity's details."
              : "Create a sales opportunity for a company and contact."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {opportunity ? (
            <input type="hidden" name="id" value={opportunity.id} />
          ) : null}

          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={opportunity?.name ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" htmlFor="company_id" required>
              <select
                id="company_id"
                name="company_id"
                required
                defaultValue={opportunity?.companyId ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  Select a company
                </option>
                {companyOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contact" htmlFor="contact_id" required>
              <select
                id="contact_id"
                name="contact_id"
                required
                defaultValue={opportunity?.contactId ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  Select a contact
                </option>
                {contactOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Business type" htmlFor="business_type" required>
              <select
                id="business_type"
                name="business_type"
                defaultValue={opportunity?.businessType ?? "flexography"}
                className={selectClass}
              >
                {OPPORTUNITY_BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {OPPORTUNITY_BUSINESS_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
            {isEdit ? null : (
              <Field label="Owner" htmlFor="owner_id">
                <select
                  id="owner_id"
                  name="owner_id"
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="">Me (default)</option>
                  {ownerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Estimated value" htmlFor="estimated_value">
              <Input
                id="estimated_value"
                name="estimated_value"
                type="number"
                min={0}
                step="0.01"
                defaultValue={opportunity?.estimatedValue?.toString() ?? ""}
              />
            </Field>
            <Field label="Probability (%)" htmlFor="probability">
              <Input
                id="probability"
                name="probability"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={(opportunity?.probability ?? 0).toString()}
              />
            </Field>
            <Field label="Expected close" htmlFor="expected_close_date">
              <Input
                id="expected_close_date"
                name="expected_close_date"
                type="date"
                defaultValue={opportunity?.expectedCloseDate ?? ""}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={opportunity?.description ?? ""}
            />
          </Field>

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
              {isEdit ? "Save changes" : "Create opportunity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
