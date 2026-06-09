export function HealthScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const cls =
    score >= 80
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : score >= 50
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400"

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={
            score >= 80
              ? "block h-full rounded-full bg-emerald-500"
              : score >= 50
                ? "block h-full rounded-full bg-amber-500"
                : "block h-full rounded-full bg-red-500"
          }
          style={{ width: `${score}%` }}
        />
      </span>
      <span
        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls}`}
      >
        {score}
      </span>
    </span>
  )
}
