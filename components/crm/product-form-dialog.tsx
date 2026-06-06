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
  PRODUCT_FAMILIES,
  PRODUCT_FAMILY_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  type Product,
} from "@/modules/crm/domain/product"
import {
  createProductAction,
  updateProductAction,
} from "@/modules/crm/presentation/product-actions"
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

const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

export function ProductFormDialog({
  tenantSlug,
  product,
  trigger,
}: {
  tenantSlug: string
  product?: Product
  trigger: React.ReactNode
}) {
  const isEdit = Boolean(product)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
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
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this product's details."
              : "Add a product to the catalog."}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          {product ? (
            <input type="hidden" name="id" value={product.id} />
          ) : null}

          <Field label="Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={product?.name ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="sku">
              <Input id="sku" name="sku" defaultValue={product?.sku ?? ""} />
            </Field>

            <Field label="Unit of Measure" htmlFor="unit_of_measure">
              <Input
                id="unit_of_measure"
                name="unit_of_measure"
                placeholder="e.g. piece, kg, liter"
                defaultValue={product?.unitOfMeasure ?? ""}
              />
            </Field>

            <Field label="Product Type" htmlFor="productType" required>
              <select
                id="productType"
                name="productType"
                required
                defaultValue={product?.productType ?? ""}
                className={selectCls}
              >
                <option value="">— Select type —</option>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Product Family" htmlFor="productFamily" required>
              <select
                id="productFamily"
                name="productFamily"
                required
                defaultValue={product?.productFamily ?? ""}
                className={selectCls}
              >
                <option value="">— Select family —</option>
                {PRODUCT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {PRODUCT_FAMILY_LABELS[f]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
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
              {isEdit ? "Save changes" : "Create product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
