"use client"

import { Loader2, X } from "lucide-react"
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
import type { PriceBookEntry } from "@/modules/crm/domain/price-book"
import type { ProductOption } from "@/modules/crm/domain/product"
import {
  deactivatePriceBookEntryAction,
  upsertPriceBookEntryAction,
} from "@/modules/crm/presentation/price-book-actions"
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"

const initialState: CrmActionState = { error: null, ok: false }

export function AddPriceBookEntryDialog({
  tenantSlug,
  priceBookId,
  products,
  trigger,
}: {
  tenantSlug: string
  priceBookId: string
  products: ProductOption[]
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    upsertPriceBookEntryAction,
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
          <DialogTitle>Agregar precio de producto</DialogTitle>
          <DialogDescription>
            Set a unit price for a product in this price book.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="priceBookId" value={priceBookId} />
          <input type="hidden" name="active" value="true" />

          <div className="space-y-1.5">
            <label htmlFor="productId" className="text-sm font-medium">
              Product <span className="text-destructive">*</span>
            </label>
            <select
              id="productId"
              name="productId"
              required
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">— Select a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` (${p.sku})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="unitPrice" className="text-sm font-medium">
              Unit Price <span className="text-destructive">*</span>
            </label>
            <Input
              id="unitPrice"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
            />
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
              Add price
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditPriceBookEntryDialog({
  tenantSlug,
  entry,
  trigger,
}: {
  tenantSlug: string
  entry: PriceBookEntry
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    upsertPriceBookEntryAction,
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
          <DialogTitle>Editar precio</DialogTitle>
          <DialogDescription>
            Update the unit price for{" "}
            <span className="font-medium">{entry.productName}</span>.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="priceBookId" value={entry.priceBookId} />
          <input type="hidden" name="productId" value={entry.productId} />
          <input type="hidden" name="active" value={String(entry.active)} />

          <div className="space-y-1.5">
            <label htmlFor="unitPriceEdit" className="text-sm font-medium">
              Unit Price <span className="text-destructive">*</span>
            </label>
            <Input
              id="unitPriceEdit"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={entry.unitPrice}
            />
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
              Save price
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DeactivatePriceBookEntryButton({
  tenantSlug,
  entry,
}: {
  tenantSlug: string
  entry: PriceBookEntry
}) {
  const [state, formAction, pending] = useActionState(
    deactivatePriceBookEntryAction,
    initialState,
  )

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="priceBookId" value={entry.priceBookId} />
      <input type="hidden" name="productId" value={entry.productId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" /> : <X className="size-4" />}
        <span className="sr-only">Quitar de la lista de precios</span>
      </Button>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  )
}
