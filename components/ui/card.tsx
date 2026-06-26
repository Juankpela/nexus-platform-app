import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { STATUS_ACCENT_BORDER } from "@/components/ui/status-pill"
import type { StatusTone } from "@/modules/service/domain/status-tone"

/**
 * Enterprise card surface: 20px radius, soft shadow, optional hover elevation.
 * The single source of truth for elevated surfaces across Nexus. `accent` añade
 * una barra de marca a la izquierda para resaltar la tarjeta operacional clave.
 */
export function Card({
  className,
  interactive = false,
  accent,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; accent?: StatusTone }) {
  return (
    <div
      className={cn(
        "card-surface",
        interactive && "card-surface-hover",
        accent && STATUS_ACCENT_BORDER[accent],
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1 p-6 pb-3", className)} {...props} />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2 p-6 pt-0", className)} {...props} />
  )
}
