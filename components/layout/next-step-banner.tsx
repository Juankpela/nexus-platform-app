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
  /** "action" = pending next step (emerald). "success" = chain complete. */
  tone?: "action" | "success"
  children?: ReactNode
}) {
  const accent =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
      : "border-emerald-300 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
  const Icon = tone === "success" ? CheckCircle2 : ArrowRight

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${accent}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
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
