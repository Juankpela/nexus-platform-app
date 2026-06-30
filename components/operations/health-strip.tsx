/**
 * Salud operacional (BLUEPRINT_ESTACION capa 2) — reducida a una LÍNEA DE ESTADO.
 *
 * Limpieza 2026-06-30 (founder): deja de ser una banda de KPIs que competía con
 * el Hero y pasa a ser CONTEXTO mínimo indispensable: estado (calma/tensión) +
 * capacidad para actuar. Sin cifras de dinero, sin tendencia — eso solo informaba.
 * El criterio es "menos competencia por la atención", no "menos componentes".
 *
 * El contrato `HealthSnapshot` NO cambia (el Read Model lo sigue produciendo
 * completo); aquí solo se renderiza lo que acerca al supervisor a la decisión.
 * Presentacional puro.
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
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-card/40 px-4 py-2 text-sm transition-opacity ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${tension ? "bg-orange-500" : "bg-emerald-500"}`}
        aria-hidden
      />
      <span className="font-medium text-foreground">
        {tension ? "Operación en tensión" : "Operación bajo control"}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="tabular-nums text-muted-foreground">{snapshot.capacity}</span>
    </div>
  )
}
