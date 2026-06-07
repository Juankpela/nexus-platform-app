import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Reusable enterprise form layout primitives. Future modules (Assets, Cases,
 * Work Orders, Scheduling) compose these for consistent spacing, labels and
 * validation states. Layout only — no field logic.
 */
export function FormSection({
  title,
  description,
  className,
  children,
}: {
  title?: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title || description ? (
        <div className="space-y-0.5">
          {title ? (
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function FormGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: 1 | 2 | 3
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />
}

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("text-xs font-medium text-foreground", className)}
      {...props}
    />
  )
}

export function FieldHint({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)} {...props} />
  )
}

export function FieldError({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  if (!children) return null
  return (
    <p role="alert" className={cn("text-xs text-destructive", className)}>
      {children}
    </p>
  )
}
