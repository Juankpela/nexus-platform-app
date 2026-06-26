/**
 * Gauge circular reutilizable para un porcentaje (SLA, utilización, conversión…).
 * Solo presentación: recibe el % ya calculado. Color por umbral.
 */
export function MiniGauge({
  title,
  pct,
  caption,
  variant = "threshold",
  size = "md",
}: {
  title: string
  pct: number | null
  caption?: string
  /** "threshold": verde/naranja/rojo por umbral (SLA, conversión). "neutral":
   * azul siempre (métricas donde "bajo" no es riesgo, p. ej. utilización). */
  variant?: "threshold" | "neutral"
  size?: "md" | "lg"
}) {
  const ring = size === "lg" ? "size-32" : "size-24"
  const valueText = size === "lg" ? "text-3xl" : "text-xl"
  const value = pct ?? 0
  const tone =
    variant === "neutral"
      ? "blue"
      : value >= 90
        ? "emerald"
        : value >= 75
          ? "orange"
          : "red"
  const stroke = { blue: "stroke-nexus-blue", emerald: "stroke-emerald-500", orange: "stroke-orange-500", red: "stroke-red-500" }[tone]
  const text = { blue: "text-nexus-blue", emerald: "text-emerald-500", orange: "text-orange-500", red: "text-red-500" }[tone]
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border bg-card p-4">
      <h3 className="self-start text-sm font-semibold text-foreground">{title}</h3>
      <div className={`relative my-2 grid ${ring} place-items-center`}>
        <svg viewBox="0 0 100 100" className={`${ring} -rotate-90`}>
          <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round"
            className={stroke}
            strokeDasharray={`${(value / 100) * 264} 264`}
          />
        </svg>
        <span className={`absolute ${valueText} font-semibold tabular-nums ${text}`}>
          {pct != null ? `${value}%` : "—"}
        </span>
      </div>
      {caption ? <p className="text-[11px] text-muted-foreground">{caption}</p> : null}
    </div>
  )
}
