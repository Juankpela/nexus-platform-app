import { Minus, TrendingDown, TrendingUp } from "lucide-react"

/**
 * Salud operacional (BLUEPRINT_ESTACION capa 2). Franja calma, peso visual
 * mínimo, glanceable en <2s. Cuatro magnitudes de valor + capacidad + 1
 * tendencia. El tinte global señala calma↔tensión. Presentacional puro.
 */
export interface HealthSnapshot {
  /** Valor protegido hoy — el marcador (ya formateado). */
  protectedToday: string
  /** Valor expuesto en ventana — lo que aún se puede proteger. */
  exposedInWindow: string
  /** Valor perdido hoy — lo que cruzó el punto de no retorno. */
  lostToday: string
  /** Capacidad de intervención disponible (slack). */
  capacity: string
  /** Tendencia del valor expuesto en ventana: ¿la operación se enferma o sana? */
  trend: "up" | "down" | "flat"
  /** Tinte global de la franja. */
  tone: "calm" | "tension"
}

type Accent = "blue" | "emerald" | "orange" | "silver"

const ACCENT_TEXT: Record<Accent, string> = {
  blue: "text-nexus-blue",
  emerald: "text-emerald-500 dark:text-emerald-400",
  orange: "text-orange-500 dark:text-orange-400",
  silver: "text-muted-foreground",
}

const ACCENT_DOT: Record<Accent, string> = {
  blue: "bg-nexus-blue",
  emerald: "bg-emerald-500 dark:bg-emerald-400",
  orange: "bg-orange-500 dark:bg-orange-400",
  silver: "bg-muted-foreground/40",
}

function Tile({
  label,
  value,
  accent,
  muted = false,
}: {
  label: string
  value: string
  accent: Accent
  muted?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${muted ? "bg-muted-foreground/40" : ACCENT_DOT[accent]}`} />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p
        className={`mt-1 tabular-nums font-semibold tracking-tight ${
          muted ? "text-base text-muted-foreground" : `text-2xl ${ACCENT_TEXT[accent]}`
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function TrendTile({ trend }: { trend: HealthSnapshot["trend"] }) {
  const config = {
    up: { Icon: TrendingUp, tone: ACCENT_TEXT.orange, word: "Expuesto subiendo" },
    down: { Icon: TrendingDown, tone: ACCENT_TEXT.emerald, word: "Expuesto bajando" },
    flat: { Icon: Minus, tone: "text-muted-foreground", word: "Estable" },
  }[trend]
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Tendencia
      </span>
      <p className={`mt-1 flex items-center gap-1.5 text-base font-medium ${config.tone}`}>
        <config.Icon className="size-4" />
        {config.word}
      </p>
    </div>
  )
}

export function HealthStrip({
  snapshot,
  dimmed = false,
}: {
  snapshot: HealthSnapshot
  dimmed?: boolean
}) {
  const tension = snapshot.tone === "tension"
  return (
    <div
      className={`rounded-2xl border p-2 transition-opacity ${
        tension
          ? "border-orange-200/60 bg-orange-50/30 dark:border-orange-900/30 dark:bg-orange-950/10"
          : "bg-card/40"
      } ${dimmed ? "opacity-40" : ""}`}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Protegido hoy" value={snapshot.protectedToday} accent="emerald" />
        <Tile label="Expuesto en ventana" value={snapshot.exposedInWindow} accent={tension ? "orange" : "blue"} />
        <Tile label="Perdido hoy" value={snapshot.lostToday} accent="silver" muted />
        <Tile label="Capacidad" value={snapshot.capacity} accent="emerald" />
        <TrendTile trend={snapshot.trend} />
      </div>
    </div>
  )
}
