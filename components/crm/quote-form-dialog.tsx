"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { QuoteActionState } from "@/modules/crm/presentation/quote-actions"
import type {
  OpportunityOption,
  PriceBookOption,
  Quote,
  QuoteDetail,
} from "@/modules/crm/domain/quote"

type CompanyOption = { id: string; name: string }
type ContactOption = { id: string; name: string }

type QuoteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (quote: Quote | QuoteDetail) => void
  tenantSlug: string
  defaultValues?: Partial<QuoteDetail>
  action: (
    _prev: QuoteActionState,
    formData: FormData,
  ) => Promise<QuoteActionState>
  title: string
  companies: CompanyOption[]
  contacts: ContactOption[]
  opportunities: OpportunityOption[]
  priceBooks: PriceBookOption[]
}

const EMPTY_STATE: QuoteActionState = { ok: false, error: null }

export function QuoteFormDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultValues,
  action,
  title,
  companies,
  contacts,
  opportunities,
  priceBooks,
}: QuoteFormDialogProps) {
  const [state, dispatch, pending] = useActionState(action, EMPTY_STATE)

  const [companyId, setCompanyId] = useState(defaultValues?.companyId ?? "")
  const [contactId, setContactId] = useState(defaultValues?.contactId ?? "")
  const [opportunityId, setOpportunityId] = useState(
    defaultValues?.opportunityId ?? "",
  )
  const [priceBookId, setPriceBookId] = useState(
    defaultValues?.priceBookId ?? "",
  )

  function handleOpenChange(next: boolean) {
    if (!pending) onOpenChange(next)
  }

  useEffect(() => {
    if (state.ok && state.data) {
      onSuccess(state.data)
      onOpenChange(false)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form action={dispatch} className="grid gap-4 py-2">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <input type="hidden" name="priceBookId" value={priceBookId} />

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Company</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={companyId}
              onChange={(e) =>
                setCompanyId(e.target.value === "_none" ? "" : e.target.value)
              }
            >
              <option value="_none">None</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Contact</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={contactId}
              onChange={(e) =>
                setContactId(e.target.value === "_none" ? "" : e.target.value)
              }
            >
              <option value="_none">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Opportunity</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={opportunityId}
              onChange={(e) =>
                setOpportunityId(
                  e.target.value === "_none" ? "" : e.target.value,
                )
              }
            >
              <option value="_none">None</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Price Book</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={priceBookId}
              onChange={(e) =>
                setPriceBookId(
                  e.target.value === "_none" ? "" : e.target.value,
                )
              }
            >
              <option value="_none">None</option>
              {priceBooks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="expirationDate">
              Expiration Date
            </label>
            <Input
              id="expirationDate"
              name="expirationDate"
              type="date"
              defaultValue={defaultValues?.expirationDate ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="discountAmount">
                Discount
              </label>
              <Input
                id="discountAmount"
                name="discountAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={defaultValues?.discountAmount ?? 0}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="taxAmount">
                Tax
              </label>
              <Input
                id="taxAmount"
                name="taxAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={defaultValues?.taxAmount ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="notes">
              Notes
            </label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={defaultValues?.notes ?? ""}
            />
          </div>

          {!state.ok && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
