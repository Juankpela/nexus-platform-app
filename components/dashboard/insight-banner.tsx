import { AlertTriangle, CheckCircle2, ShieldAlert, type LucideIcon } from "lucide-react"
import Link from "next/link"

export type InsightLevel = "healthy" | "attention" | "risk"

const STYLE: Record<InsightLevel, { wrap: string; icon: LucideIcon; dot: string; iconCls: string }> = {
  healthy: {
    wrap: "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    iconCls: "text-emerald-600 dark:text-emerald-400",
  },
  attention: {
    wrap: "border-orange-200/70 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-950/20",
    icon: AlertTriangle,
    dot: "bg-orange-500",
    iconCls: "text-orange-600 dark:text-orange-400",
  },
  risk: {
    wrap: "border-red-200/70 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20",
    icon: ShieldAlert,
    dot: "bg-red-500",
    iconCls: "text-red-600 dark:text-red-400",
  },
}

/**
 * Executive Insight Banner — la diferencia entre mostrar datos e interpretarlos.
 * Resume el estado de la operación en UNA frase con nivel de prioridad. El mensaje
 * lo calcula cada dashboard a partir de datos YA disponibles (sin consultas nuevas);
 * este componente solo lo presenta. Es el primer elemento de la pantalla: el
 * gerente debe sentir que el sistema piensa.
 */
export function InsightBanner({
  level,
  headline,
  detail,
  action,
}: {
  level: InsightLevel
  headline: string
  detail?: string
  action?: { label: string; href: string }
}) {
  const s = STYLE[level]
  const Icon = s.icon
  return (
    <div className={`flex items-start gap-4 rounded-2xl border p-5 ${s.wrap}`}>
      <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-card ${s.iconCls}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${s.dot} ${level !== "healthy" ? "animate-pulse" : ""}`} />
          <h2 className="text-base font-semibold text-foreground">{headline}</h2>
        </div>
        {detail ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 self-center rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
