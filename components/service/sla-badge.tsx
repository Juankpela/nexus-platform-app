import type { CasePriority } from "@/modules/service/domain/case"
import {
  SLA_STATUS_LABELS,
  computeSlaStatus,
  type SlaStatus,
} from "@/modules/service/domain/sla"

const STATUS_STYLES: Record<SlaStatus, string> = {
  on_track: "bg-status-success/10 text-status-success",
  at_risk: "bg-status-attention/10 text-status-attention",
  breached: "bg-status-critical/10 text-status-critical",
  met: "bg-muted text-muted-foreground",
}

function relativeLabel(slaDueAt: string, now: Date): string {
  const diffMs = new Date(slaDueAt).getTime() - now.getTime()
  const abs = Math.abs(diffMs)
  const hours = Math.floor(abs / 3_600_000)
  const days = Math.floor(hours / 24)
  const unit = days >= 1 ? `${days}d` : `${hours}h`
  return diffMs >= 0 ? `${unit} restantes` : `vencido hace ${unit}`
}

export function SlaBadge({
  slaDueAt,
  priority,
  resolvedAt,
  closedAt,
}: {
  slaDueAt: string | null
  priority: CasePriority
  resolvedAt: string | null
  closedAt: string | null
}) {
  if (!slaDueAt) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const now = new Date()
  const status = computeSlaStatus({ slaDueAt, priority, resolvedAt, closedAt, now })
  if (!status) return <span className="text-xs text-muted-foreground">—</span>

  const isOpen = !resolvedAt && !closedAt

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
      >
        {SLA_STATUS_LABELS[status]}
      </span>
      {isOpen ? (
        <span className="text-[11px] text-muted-foreground">
          {relativeLabel(slaDueAt, now)}
        </span>
      ) : null}
    </span>
  )
}
