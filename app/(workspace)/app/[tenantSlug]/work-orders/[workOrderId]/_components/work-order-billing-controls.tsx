"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { BadgeCheck, CircleDollarSign, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  approveWorkOrderBillingAction,
  setWorkOrderBillableAction,
} from "@/modules/service/presentation/work-order-actions"

const INITIAL = { ok: false, error: null as string | null }

type Props = {
  tenantSlug: string
  workOrderId: string
  status: string
  billable: boolean
  billingApprovedAt: string | null
  /** service.work_orders.write — coordinator may set billability. */
  canWrite: boolean
  /** billing.invoices.write — billing role may approve. */
  canApprove: boolean
}

export function WorkOrderBillingControls({
  tenantSlug,
  workOrderId,
  status,
  billable,
  billingApprovedAt,
  canWrite,
  canApprove,
}: Props) {
  const router = useRouter()
  const [billableState, setBillable, billablePending] = useActionState(
    setWorkOrderBillableAction,
    INITIAL,
  )
  const [approveState, approve, approvePending] = useActionState(
    approveWorkOrderBillingAction,
    INITIAL,
  )

  useEffect(() => {
    if (billableState.ok || approveState.ok) router.refresh()
  }, [billableState.ok, approveState.ok, router])

  const approved = billingApprovedAt !== null
  const canApproveNow =
    canApprove && billable && status === "completed" && !approved

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Facturación</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {billable ? "Facturable" : "No facturable"}
            {approved
              ? ` · Aprobada para facturación (${new Date(billingApprovedAt).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })})`
              : billable
                ? " · Pendiente de aprobación"
                : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <form action={setBillable}>
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="id" value={workOrderId} />
              <input
                type="hidden"
                name="billable"
                value={billable ? "false" : "true"}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={billablePending}
              >
                {billablePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                )}
                {billable ? "Marcar no facturable" : "Marcar facturable"}
              </Button>
            </form>
          )}

          {canApproveNow && (
            <form action={approve}>
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="id" value={workOrderId} />
              <Button type="submit" size="sm" disabled={approvePending}>
                {approvePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="mr-2 h-4 w-4" />
                )}
                Aprobar para facturación
              </Button>
            </form>
          )}
        </div>
      </div>

      {(billableState.error || approveState.error) && (
        <p className="mt-3 text-sm text-destructive">
          {billableState.error ?? approveState.error}
        </p>
      )}
    </div>
  )
}
