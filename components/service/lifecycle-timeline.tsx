import { AlertTriangle, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  formatWhen,
  type LifecycleMilestone,
} from "@/modules/service/domain/service-lifecycle"

/**
 * Línea de vida visual de una solicitud. Pinta los hitos de `buildServiceLifecycle`
 * como una línea de tiempo vertical. Presentacional puro (server component): no
 * decide estados, solo los muestra. Se usa idéntico en la página pública de
 * seguimiento y en el detalle de Work Order.
 */
export function LifecycleTimeline({
  milestones,
}: {
  milestones: LifecycleMilestone[]
}) {
  return (
    <ol className="relative">
      {milestones.map((m, i) => {
        const last = i === milestones.length - 1
        return (
          <li key={m.key} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Riel + nodo */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px",
                  m.state === "done" ? "bg-status-success/40" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                m.state === "done" &&
                  "border-status-success/40 bg-status-success/15 text-status-success",
                m.state === "current" &&
                  "border-status-active/40 bg-status-active/15 text-status-active",
                m.state === "blocked" &&
                  "border-status-attention/40 bg-status-attention/15 text-status-attention",
                m.state === "pending" && "border-border bg-muted text-muted-foreground/50",
              )}
            >
              {m.state === "done" ? (
                <Check className="size-3.5" />
              ) : m.state === "blocked" ? (
                <AlertTriangle className="size-3.5" />
              ) : m.state === "current" ? (
                <span className="size-2 animate-pulse rounded-full bg-status-active" />
              ) : (
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </span>

            {/* Contenido */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p
                  className={cn(
                    "text-sm font-medium",
                    m.state === "pending" ? "text-muted-foreground/70" : "text-foreground",
                    m.state === "current" && "text-status-active",
                    m.state === "blocked" && "text-status-attention",
                  )}
                >
                  {m.label}
                  {m.state === "current" ? (
                    <span className="ml-2 text-xs font-normal text-status-active">
                      en curso
                    </span>
                  ) : null}
                </p>
                {m.at ? (
                  <time className="shrink-0 text-xs capitalize tabular-nums text-muted-foreground">
                    {formatWhen(m.at)}
                  </time>
                ) : null}
              </div>
              {m.detail ? (
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    m.state === "blocked"
                      ? "text-status-attention"
                      : "text-muted-foreground",
                  )}
                >
                  {m.detail}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
