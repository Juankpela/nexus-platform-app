import { cn } from "@/lib/utils"
import type { StatusTone } from "@/modules/service/domain/status-tone"

/**
 * Pill de estado con tono de marca (tint 10% + texto del acento). Fuente única de
 * los chips de estado en toda la app: recibe un `tone` semántico y el label ya
 * traducido. Mantiene el lienzo monocromo y solo aporta el acento de color.
 */
const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-status-success/10 text-status-success",
  active: "bg-status-active/10 text-status-active",
  attention: "bg-status-attention/10 text-status-attention",
  critical: "bg-status-critical/10 text-status-critical",
  neutral: "bg-muted text-muted-foreground",
}

/** Barra fina de acento de marca a la izquierda de una tarjeta, según el tono. */
export const STATUS_ACCENT_BORDER: Record<StatusTone, string> = {
  success: "border-l-2 border-l-status-success",
  active: "border-l-2 border-l-status-active",
  attention: "border-l-2 border-l-status-attention",
  critical: "border-l-2 border-l-status-critical",
  neutral: "border-l-2 border-l-status-neutral",
}

export function StatusPill({
  tone,
  label,
  className,
}: {
  tone: StatusTone
  label: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  )
}
