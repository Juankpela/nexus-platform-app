import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type ActivityItem = {
  id: string
  title: string
  meta?: string
  timestamp: string
  icon?: LucideIcon
}

/** Recent-activity widget. Presentational — items are supplied by the caller. */
export function ActivityFeed({
  title = "Recent activity",
  items,
}: {
  title?: string
  items: ActivityItem[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Inbox className="size-6 opacity-60" />
            No recent activity yet.
          </div>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    {item.meta ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.meta}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.timestamp}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
