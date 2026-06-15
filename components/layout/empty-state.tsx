import { CircleDashed } from "lucide-react"
import type { ReactNode } from "react"

export function EmptyState({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  /** Optional call-to-action(s): reuse the list's existing create/import triggers. */
  actions?: ReactNode
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl border bg-muted/40">
          <CircleDashed className="size-5 text-muted-foreground" />
        </span>
        <h2 className="mt-4 text-sm font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {actions ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
