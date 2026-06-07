import { cn } from "@/lib/utils"
import {
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  type Opportunity,
  type OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import Link from "next/link"

// ── Column definitions ─────────────────────────────────────────────────────
type ColumnDef = {
  status: OpportunityStatus
  topBorder: string
  badge: string
}

const COLUMNS: ColumnDef[] = [
  {
    status: "new",
    topBorder: "border-t-slate-400",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    status: "discovery",
    topBorder: "border-t-sky-400",
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    status: "proposal",
    topBorder: "border-t-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  {
    status: "negotiation",
    topBorder: "border-t-amber-400",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    status: "won",
    topBorder: "border-t-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    status: "lost",
    topBorder: "border-t-red-400",
    badge: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
]

const TYPE_COLORS: Record<string, string> = {
  flexography: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  inks:        "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  consumables: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  consulting:  "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  machinery:   "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
}

function fmt(v: number | null): string {
  if (v == null || v === 0) return "—"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v.toLocaleString()}`
}

// ── Component ──────────────────────────────────────────────────────────────

export function OpportunityKanban({
  opportunities,
  basePath,
}: {
  opportunities: Opportunity[]
  basePath: string
}) {
  // Group by status
  const byStatus = new Map<OpportunityStatus, Opportunity[]>()
  for (const opp of opportunities) {
    const col = byStatus.get(opp.status) ?? []
    col.push(opp)
    byStatus.set(opp.status, col)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: "68vh" }}>
      {COLUMNS.map(({ status, topBorder, badge }) => {
        const cards = byStatus.get(status) ?? []
        const colTotal = cards.reduce((s, o) => s + (o.estimatedValue ?? 0), 0)

        return (
          <div
            key={status}
            className={cn(
              "flex min-w-[264px] max-w-[264px] flex-col rounded-xl border border-t-[3px] bg-muted/20",
              topBorder,
            )}
          >
            {/* ── Column header ── */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">
                  {OPPORTUNITY_STATUS_LABELS[status]}
                </span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", badge)}>
                  {cards.length}
                </span>
              </div>
              {colTotal > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {fmt(colTotal)}
                </span>
              )}
            </div>

            {/* ── Cards ── */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {cards.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground/50">
                  Sin oportunidades
                </p>
              ) : (
                cards.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`${basePath}/${opp.id}`}
                    className="group block rounded-lg border border-border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft-lg"
                  >
                    {/* Name */}
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
                      {opp.name}
                    </p>

                    {/* Company + contact */}
                    {opp.companyName && (
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {opp.companyName}
                        {opp.contactName ? ` · ${opp.contactName}` : ""}
                      </p>
                    )}

                    {/* Value + type */}
                    <div className="mt-2.5 flex items-center justify-between gap-1.5">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {fmt(opp.estimatedValue)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          TYPE_COLORS[opp.businessType] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {OPPORTUNITY_BUSINESS_TYPE_LABELS[opp.businessType]}
                      </span>
                    </div>

                    {/* Probability bar */}
                    {opp.probability > 0 && opp.probability < 100 && (
                      <div className="mt-2.5">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/50"
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-right text-[10px] text-muted-foreground/70">
                          {opp.probability}%
                        </p>
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
