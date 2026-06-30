import { Minus, TrendingDown, TrendingUp } from "lucide-react"

/**
 * Salud operacional (BLUEPRINT_ESTACION capa 2). Franja FINA, monocroma y de
 * peso mínimo: un vistazo glanceable que NUNCA compite con el Hero.
 *
 * Release Polish v1 — sin color saturado, sin lavado de tinte, tipografía
 * pequeña. El único elemento primario saturado de la pantalla es la acción del
 * Hero. La señal calma↔tensión la lleva el contenido (valor expuesto + tendencia),
 * no el color. Presentacional puro.
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
  /** Estado global (lo deriva el orquestador; el silencio fuerza "calm"). */
  tone: "calm" | "tension"
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${
          muted ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

const TREND_WORD: Record<HealthSnapshot["trend"], string> = {
  up: "Expuesto subiendo",
  down: "Expuesto bajando",
  flat: "Estable",
}

export function HealthStrip({
  snapshot,
  dimmed = false,
}: {
  snapshot: HealthSnapshot
  dimmed?: boolean
}) {
  const TrendIcon =
    snapshot.trend === "up" ? TrendingUp : snapshot.trend === "down" ? TrendingDown : Minus
  return (
    <div
      className={`rounded-xl border bg-card/40 px-4 py-2.5 transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Protegido hoy" value={snapshot.protectedToday} />
        <Metric label="Expuesto en ventana" value={snapshot.exposedInWindow} />
        <Metric label="Perdido hoy" value={snapshot.lostToday} muted />
        <Metric label="Capacidad" value={snapshot.capacity} />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Tendencia
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-muted-foreground">
            <TrendIcon className="size-3.5 shrink-0" />
            <span className="truncate">{TREND_WORD[snapshot.trend]}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
