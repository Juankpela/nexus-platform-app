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
import type { CrmActionState } from "@/modules/crm/presentation/require-crm-context"
import {
  computeLineTotal,
  type ProductLineOption,
  type QuoteLine,
} from "@/modules/crm/domain/quote"

type QuoteLineFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  action: (
    _prev: CrmActionState,
    formData: FormData,
  ) => Promise<CrmActionState>
  products: ProductLineOption[]
  defaultValues?: Partial<QuoteLine>
  title: string
  sortOrder?: number
}

const EMPTY_STATE: CrmActionState = { ok: false, error: null }

export function QuoteLineForm({
  open,
  onOpenChange,
  onSuccess,
  action,
  products,
  defaultValues,
  title,
  sortOrder = 0,
}: QuoteLineFormProps) {
  const [state, dispatch, pending] = useActionState(action, EMPTY_STATE)

  const [productId, setProductId] = useState(defaultValues?.productId ?? "")
  const [quantity, setQuantity] = useState(defaultValues?.quantity ?? 1)
  const [unitPrice, setUnitPrice] = useState(defaultValues?.unitPrice ?? 0)
  const [discountAmount, setDiscountAmount] = useState(
    defaultValues?.discountAmount ?? 0,
  )

  const lineTotal = computeLineTotal(quantity, unitPrice, discountAmount)

  function handleProductChange(id: string) {
    setProductId(id)
    const product = products.find((p) => p.id === id)
    if (product?.defaultUnitPrice != null) {
      setUnitPrice(product.defaultUnitPrice)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!pending) onOpenChange(next)
  }

  useEffect(() => {
    if (state.ok) {
      onSuccess()
      onOpenChange(false)
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form action={dispatch} className="grid gap-4 py-2">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="unitPrice" value={unitPrice} />
          <input type="hidden" name="discountAmount" value={discountAmount} />
          <input type="hidden" name="sortOrder" value={sortOrder} />

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Product</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.sku ? ` · ${p.sku}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="qty">
              Quantity
            </label>
            <Input
              id="qty"
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="price">
              Unit Price
            </label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="disc">
              Line Discount
            </label>
            <Input
              id="disc"
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(Number(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Line Total</span>
            <span className="font-medium tabular-nums">
              {lineTotal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="lineNotes">
              Notes
            </label>
            <Textarea
              id="lineNotes"
              name="notes"
              rows={2}
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
            <Button type="submit" disabled={pending || !productId}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
