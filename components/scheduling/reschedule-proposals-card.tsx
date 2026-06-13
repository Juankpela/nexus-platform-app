import { CalendarClock, UserCog, Clock4 } from "lucide-react"
import Link from "next/link"

import { NON_COMPLETION_REASON_LABELS } from "@/modules/field-execution/domain/disposition"
import { minutesToHHMM } from "@/modules/service/domain/availability"
import type { RescheduleProposalView } from "@/modules/scheduling/domain/reschedule-proposal"

function reasonLabel(view: RescheduleProposalView): string {
  return view.nonCompletionReason
    ? NON_COMPLETION_REASON_LABELS[view.nonCompletionReason]
    : "—"
}

/**
 * Read-only feed of dry-run reschedule proposals (PR5b). The engine only
 * proposes — nothing is assigned automatically. The dispatcher acts manually.
 */
export function RescheduleProposalsCard({
  proposals,
  tenantSlug,
}: {
  proposals: RescheduleProposalView[]
  tenantSlug: string
}) {
  const reschedule = proposals.filter((p) => p.outcome === "reschedule")
  const needsHuman = proposals.filter(
    (p) => p.outcome === "reassign_needs_human" || p.outcome === "no_slot",
  )

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Propuestas de reagendamiento</h2>
        <span className="text-xs text-muted-foreground">(dry-run · no asigna)</span>
      </div>

      {proposals.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Sin propuestas. El motor propone solo cuando una orden falla con un motivo reagendable.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {reschedule.length > 0 ? (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                <Clock4 className="size-3.5" /> Reagendar (mismo técnico)
              </p>
              <ul className="space-y-1.5">
                {reschedule.map((p) => (
                  <li key={p.workOrderId}>
                    <Link
                      href={`/app/${tenantSlug}/work-orders/${p.workOrderId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <span className="font-medium text-foreground">{p.technicianName ?? "—"}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {p.proposedDate} · {p.proposedStartMinute !== null ? minutesToHHMM(p.proposedStartMinute) : "—"}
                        –{p.proposedEndMinute !== null ? minutesToHHMM(p.proposedEndMinute) : "—"}
                      </span>
                      <span className="text-muted-foreground/70">{reasonLabel(p)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {needsHuman.length > 0 ? (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <UserCog className="size-3.5" /> Requieren decisión humana
              </p>
              <ul className="space-y-1.5">
                {needsHuman.map((p) => (
                  <li key={p.workOrderId}>
                    <Link
                      href={`/app/${tenantSlug}/work-orders/${p.workOrderId}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/10 px-2.5 py-1.5 text-xs hover:bg-muted/30"
                    >
                      <span className="text-muted-foreground">{reasonLabel(p)}</span>
                      <span className="text-muted-foreground/70">
                        {p.outcome === "no_slot" ? "Sin cupo en el horizonte" : "Reasignar (otro técnico)"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
