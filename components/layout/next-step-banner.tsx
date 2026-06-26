import { ArrowRight, CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

/**
 * "Siguiente paso recomendado" — surfaces the next action in the cash chain
 * (work done → invoiced → collected) at the top of a detail screen. Purely
 * presentational: it wraps the screen's *existing* action (passed as children)
 * so the recommended step is impossible to miss. No new actions or logic.
 */
export function NextStepBanner({
  title,
  description,
  tone = "action",
  children,
}: {
  title: string
  description: string
  /** "action"/"success" = paso del lazo de dinero (emerald). "attention" = paso de riesgo (orange). */
  tone?: "action" | "success" | "attention"
  children?: ReactNode
}) {
  const isAttention = tone === "attention"
  const accent = isAttention
    ? "border-status-attention/30 bg-status-attention/[0.06]"
    : "border-status-success/30 bg-status-success/[0.06]"
  const iconWrap = isAttention
    ? "bg-status-attention/15 text-status-attention"
    : "bg-status-success/15 text-status-success"
  const Icon = tone === "success" ? CheckCircle2 : ArrowRight

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${accent}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${iconWrap}`}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}
