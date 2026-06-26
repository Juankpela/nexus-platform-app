"use client"

import { Loader2, PackagePlus } from "lucide-react"
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
import {
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/modules/inventory/domain/inventory-transaction"
import { recordStockMovementAction } from "@/modules/inventory/presentation/stock-actions"
import type { InventoryActionState } from "@/modules/inventory/presentation/require-inventory-context"

const initialState: InventoryActionState = { error: null, ok: false }

const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

// Movimientos manuales disponibles desde el detalle del material, por permiso.
const MANAGE_TYPES: TransactionType[] = ["receipt", "adjustment", "reservation", "release"]
const CONSUME_TYPES: TransactionType[] = ["consumption"]

const HINTS: Record<TransactionType, string> = {
  receipt: "Suma unidades al stock disponible.",
  adjustment: "Corrige el stock. Usa un valor negativo para disminuir.",
  reservation: "Aparta unidades del disponible (sin sacarlas del stock).",
  release: "Libera una reserva previa.",
  consumption: "Descuenta unidades consumidas del stock.",
}

export function StockMovementDialog({
  tenantSlug,
  materialId,
  materialName,
  unitOfMeasure,
  canManage,
  canConsume,
}: {
  tenantSlug: string
  materialId: string
  materialName: string
  unitOfMeasure: string
  canManage: boolean
  canConsume: boolean
}) {
  const types: TransactionType[] = [
    ...(canManage ? MANAGE_TYPES : []),
    ...(canConsume ? CONSUME_TYPES : []),
  ]
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>(types[0] ?? "receipt")
  const [state, formAction, pending] = useActionState(
    recordStockMovementAction.bind(null, tenantSlug),
    initialState,
  )

  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !pending && state.ok) setOpen(false)
    wasPending.current = pending
  }, [pending, state.ok])

  if (types.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackagePlus className="mr-2 size-4" />
          Registrar movimiento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>{materialName}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="materialId" value={materialId} />

          <div className="space-y-1.5">
            <label htmlFor="type" className="text-sm font-medium">
              Tipo de movimiento
            </label>
            <select
              id="type"
              name="type"
              className={selectCls}
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {TRANSACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{HINTS[type]}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="quantity" className="text-sm font-medium">
              Cantidad{" "}
              <span className="text-muted-foreground">({unitOfMeasure})</span>
            </label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="0.0001"
              {...(type === "adjustment" ? {} : { min: "0.0001" })}
              required
              placeholder={type === "adjustment" ? "Ej. -5 o 10" : "Ej. 10"}
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
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
