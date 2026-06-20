"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, useTransition } from "react"
import { Banknote, Loader2, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  type PaymentDetail,
} from "@/modules/billing/domain/payment"
import {
  recordPaymentAction,
  reversePaymentAction,
} from "@/modules/billing/presentation/payment-actions"
import { formatCOP } from "@/lib/format/money"
import { formatDateNumeric } from "@/lib/format/datetime"

const INITIAL = { ok: false, error: null as string | null }

const money = formatCOP

type Props = {
  tenantSlug: string
  invoiceId: string
  companyId: string
  balance: number
  status: string
  payments: PaymentDetail[]
  canWrite: boolean
}

export function InvoicePaymentsSection({
  tenantSlug,
  invoiceId,
  companyId,
  balance,
  status,
  payments,
  canWrite,
}: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "0")
  const [reversePending, startReverse] = useTransition()
  const [state, record, recordPending] = useActionState(
    recordPaymentAction.bind(null, tenantSlug),
    INITIAL,
  )

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  const canRecord =
    canWrite && (status === "issued" || status === "partially_paid") && balance > 0

  function handleReverse(paymentId: string) {
    const reason = window.prompt("Motivo de la reversa del pago:")
    if (!reason) return
    startReverse(async () => {
      const r = await reversePaymentAction(tenantSlug, paymentId, reason)
      if (r.ok) router.refresh()
      else if (r.error) window.alert(r.error)
    })
  }

  const allocations = JSON.stringify([
    { invoiceId, amount: Number(amount) || 0 },
  ])

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Pagos</h2>

      {/* Applied payments */}
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
      ) : (
        <div className="divide-y rounded-md border text-sm">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{p.paymentNumber}</span>
                <span className="text-muted-foreground">
                  {formatDateNumeric(p.paymentDate)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">
                  {money(p.allocations[0]?.amount ?? p.amount)}
                </span>
                {canWrite && p.status === "recorded" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    disabled={reversePending}
                    onClick={() => handleReverse(p.id)}
                    title="Reversar pago"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record payment */}
      {canRecord && (
        <form action={record} className="space-y-3 border-t pt-4">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="allocations" value={allocations} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Monto</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Fecha</span>
              <Input
                type="date"
                name="paymentDate"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="h-9"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Método</span>
              <select
                name="method"
                defaultValue="transfer"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Referencia</span>
              <Input name="reference" className="h-9" />
            </label>
          </div>
          <Button type="submit" size="sm" disabled={recordPending}>
            {recordPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Banknote className="mr-2 h-4 w-4" />
            )}
            Registrar pago
          </Button>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </form>
      )}
    </div>
  )
}
