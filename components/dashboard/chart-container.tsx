import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Titled container for a chart. Holds layout + header; the chart library and
 * data are plugged in later by the caller via children.
 */
export function ChartContainer({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        {children ?? (
          <div className="grid h-56 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Chart coming soon
          </div>
        )}
      </CardContent>
    </Card>
  )
}
