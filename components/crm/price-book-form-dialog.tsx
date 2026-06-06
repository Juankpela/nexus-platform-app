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
import type { PriceBook } from "@/modules/crm/domain/price-book"
import {
  createPriceBookAction,
  updatePriceBookAction,
} from "@/modules/crm/presentation/price-book-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

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

export function PriceBookFormDialog({
  tenantSlug,
  priceBook,
  trigger,
}: {
  tenantSlug: string
  priceBook?: PriceBook
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(priceBook)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updatePriceBookAction : createPriceBookAction,
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
            {isEdit ? "Edit price book" : "New price book"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this price book's details."
              : "Create a price book for a customer segment."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {priceBook ? (
            <input type="hidden" name="id" value={priceBook.id} />
          ) : null}

          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              placeholder="e.g. Standard, Wholesale, Enterprise"
              defaultValue={priceBook?.name ?? ""}
            />
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={priceBook?.description ?? ""}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              value="true"
              defaultChecked={priceBook ? priceBook.active : true}
              className="h-4 w-4 rounded border-input"
              onChange={(e) => {
                const hiddenInput = e.currentTarget.form?.querySelector(
                  'input[name="active"][type="hidden"]',
                ) as HTMLInputElement | null
                if (hiddenInput) {
                  hiddenInput.value = e.currentTarget.checked ? "true" : "false"
                }
              }}
            />
            <label htmlFor="active" className="text-sm font-medium">
              Active
            </label>
          </div>
          <input
            type="hidden"
            name="active"
            defaultValue={priceBook ? String(priceBook.active) : "true"}
          />

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
              {isEdit ? "Save changes" : "Create price book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
