"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { Ban, FileCheck2, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  isInvoiceMutable,
  type InvoiceDetail,
  type InvoiceLine,
} from "@/modules/billing/domain/invoice"
import {
  addInvoiceLineAction,
  issueInvoiceAction,
  removeInvoiceLineAction,
  updateInvoiceDraftAction,
  voidInvoiceAction,
} from "@/modules/billing/presentation/invoice-actions"

type Props = {
  tenantSlug: string
  invoice: InvoiceDetail
  lines: InvoiceLine[]
  canWrite: boolean
  canIssue: boolean
  canVoid: boolean
}

const INITIAL = { ok: false, error: null as string | null }

export function InvoiceDetailActions({
  tenantSlug,
  invoice,
  lines,
  canWrite,
  canIssue,
  canVoid,
}: Props) {
  const router = useRouter()
  const editable = isInvoiceMutable(invoice.status)

  const [issuePending, startIssue] = useTransition()
  const [voidPending, startVoid] = useTransition()

  const [lineState, addLine, addLinePending] = useActionState(
    addInvoiceLineAction.bind(null, tenantSlug, invoice.id),
    INITIAL,
  )
  const [draftState, saveDraft, draftPending] = useActionState(
    updateInvoiceDraftAction.bind(null, tenantSlug, invoice.id),
    INITIAL,
  )

  useEffect(() => {
    if (lineState.ok || draftState.ok) router.refresh()
  }, [lineState.ok, draftState.ok, router])

  function handleIssue() {
    startIssue(async () => {
      const r = await issueInvoiceAction(tenantSlug, invoice.id)
      if (r.ok) router.refresh()
      else if (r.error) window.alert(r.error)
    })
  }

  function handleVoid() {
    const reason = window.prompt("Motivo de anulación de la factura:")
    if (!reason) return
    startVoid(async () => {
      const r = await voidInvoiceAction(tenantSlug, invoice.id, reason)
      if (r.ok) router.refresh()
      else if (r.error) window.alert(r.error)
    })
  }

  function handleRemoveLine(lineId: string) {
    startVoid(async () => {
      await removeInvoiceLineAction(tenantSlug, invoice.id, lineId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Lifecycle buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {editable && canIssue && (
          <Button size="sm" onClick={handleIssue} disabled={issuePending}>
            {issuePending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileCheck2 className="mr-2 h-4 w-4" />
            )}
            Emitir factura
          </Button>
        )}
        {(invoice.status === "issued" ||
          invoice.status === "partially_paid") &&
          canVoid && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleVoid}
              disabled={voidPending}
            >
              <Ban className="mr-2 h-4 w-4" />
              Anular
            </Button>
          )}
      </div>

      {/* Draft-only editing */}
      {editable && canWrite && (
        <div className="space-y-6 rounded-xl border bg-card p-4">
          {/* Edit header */}
          <form action={saveDraft} className="space-y-3">
            <h2 className="text-sm font-semibold">Editar borrador</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Fecha de vencimiento</span>
                <Input
                  type="date"
                  name="dueDate"
                  defaultValue={invoice.dueDate ?? ""}
                  className="h-9"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Condiciones</span>
                <Input
                  name="paymentTerms"
                  defaultValue={invoice.paymentTerms ?? ""}
                  placeholder="Ej. 30 días"
                  className="h-9"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Notas</span>
                <Input
                  name="notes"
                  defaultValue={invoice.notes ?? ""}
                  className="h-9"
                />
              </label>
            </div>
            <input type="hidden" name="contactId" value={invoice.contactId ?? ""} />
            <Button type="submit" size="sm" variant="secondary" disabled={draftPending}>
              {draftPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar borrador
            </Button>
            {draftState.error && (
              <p className="text-sm text-destructive">{draftState.error}</p>
            )}
          </form>

          {/* Existing lines with remove */}
          {lines.length > 0 && (
            <div className="divide-y rounded-md border text-sm">
              {lines.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="truncate">{l.description}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={voidPending}
                    onClick={() => handleRemoveLine(l.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add line */}
          <form action={addLine} className="space-y-3 border-t pt-4">
            <h2 className="text-sm font-semibold">Agregar línea</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <label className="col-span-2 space-y-1 text-sm sm:col-span-2">
                <span className="text-xs text-muted-foreground">Descripción</span>
                <Input name="description" required className="h-9" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Cant.</span>
                <Input type="number" step="0.0001" min="0.0001" name="quantity" defaultValue="1" className="h-9" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Precio unitario</span>
                <Input type="number" step="0.01" min="0" name="unitPrice" defaultValue="0" className="h-9" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Descuento</span>
                <Input type="number" step="0.01" min="0" name="discountAmount" defaultValue="0" className="h-9" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Tasa de impuesto</span>
                <Input type="number" step="0.0001" min="0" name="taxRate" defaultValue="0.19" className="h-9" />
              </label>
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={addLinePending}>
              {addLinePending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Agregar línea
            </Button>
            {lineState.error && (
              <p className="text-sm text-destructive">{lineState.error}</p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
