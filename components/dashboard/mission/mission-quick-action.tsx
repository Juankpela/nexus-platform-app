import type { LucideIcon } from "lucide-react"
import Link from "next/link"

/** A prominent shortcut to create/manage a core entity. */
export function MissionQuickAction({
  label,
  icon: Icon,
  href,
}: {
  label: string
  icon: LucideIcon
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <Icon className="size-4 text-primary" />
      {label}
    </Link>
  )
}
