import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Shared enterprise table pattern (Salesforce / HubSpot feel): card surface,
 * sticky header, generous row spacing, hover states. Every CRM module should
 * compose these primitives instead of hand-rolling <table> markup.
 */
export function DataTable({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("card-surface overflow-hidden", className)}>
      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur supports-[backdrop-filter]:bg-muted/55">
      {children}
    </thead>
  )
}

export function HeadCell({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />
}

export function Row({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b transition-colors last:border-0 hover:bg-muted/40",
        className,
      )}
      {...props}
    />
  )
}

export function Cell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-3.5 align-middle text-foreground", className)}
      {...props}
    />
  )
}
