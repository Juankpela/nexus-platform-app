import Link from "next/link"
import { FileText, Receipt, Wallet, Wrench, type LucideIcon } from "lucide-react"

import {
  REVENUE_EVENT_LABELS,
  type CustomerRevenueTimeline,
  type RevenueEventType,
} from "@/modules/billing/domain/revenue-timeline"

const ICONS: Record<RevenueEventType, LucideIcon> = {
  quote: FileText,
  work_order: Wrench,
  invoice: Receipt,
  payment: Wallet,
}

function money(n: number): string {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function RevenueTimeline({
  tenantSlug,
  timeline,
}: {
  tenantSlug: string
  timeline: CustomerRevenueTimeline
}) {
  const { summary, events } = timeline

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Relación económica</h2>

      {/* Summary — the three numbers that matter */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Facturado
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {money(summary.invoiced)}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Cobrado
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {money(summary.paid)}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Saldo pendiente
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {money(summary.balance)}
          </div>
        </div>
      </div>

      {/* Chronological events, navigable to origin */}
      {events.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Sin actividad económica todavía.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {events.map((e) => {
              const Icon = ICONS[e.type]
              const title = e.href ? (
                <Link
                  href={`/app/${tenantSlug}/${e.href}`}
                  className="font-medium hover:underline"
                >
                  {e.title}
                </Link>
              ) : (
                <span className="font-medium">{e.title}</span>
              )
              return (
                <li
                  key={`${e.type}-${e.id}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {title}
                      <span className="text-xs text-muted-foreground">
                        {REVENUE_EVENT_LABELS[e.type]}
                      </span>
                    </div>
                    {e.detail && (
                      <div className="text-xs capitalize text-muted-foreground">
                        {e.detail.replace(/_/g, " ")}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {e.amount !== null && (
                      <div className="tabular-nums">{money(e.amount)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("es-CO")}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
