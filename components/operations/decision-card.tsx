import { Button } from "@/components/ui/button"

/**
 * Interfaz mínima que consume el Hero (cambio aprobado del founder, 2026-06-30):
 * el Hero NO conoce el dominio ni el Read Model. Recibe valores YA formateados
 * (strings), de modo que ni siquiera depende de los formateadores del dominio.
 * Hoy se alimenta con mock; el Read Model producirá objetos `Decision` en un PR
 * posterior. Esto permite iterar la experiencia con independencia de los datos.
 */
export interface Decision {
  /** Qué ocurre · por qué importa — el titular de la decisión (capa 1). */
  headline: string
  /** Valor económico expuesto, ya formateado (p.ej. "$8.000.000"). */
  valueExposed: string
  /** Tiempo al PUNTO DE NO RETORNO, ya formateado (p.ej. "en 46 h") — no el plazo. */
  timeToPointOfNoReturn: string
  /** Acción reversible recomendada (texto, p.ej. "reasignar a Carlos"). */
  recommendedAction: string
  /** Una sola línea de evidencia que sustenta la decisión. */
  evidenceLine: string
}

/**
 * DecisionHero — "La decisión de ahora" (BLUEPRINT_ESTACION capa 1, nivel 0).
 * Presentacional PURO: una sola decisión ejecutable, no una notificación.
 * `null` ⇒ SilencePanel: todo lo material está protegido (estado de silencio).
 * La acción recomendada es el único primario saturado de la pantalla (variant default).
 */
export function DecisionCard({ decision }: { decision: Decision | null }) {
  if (!decision) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border bg-card px-8 py-14 text-center">
        <p className="text-lg font-medium text-foreground">Todo lo material está protegido</p>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          No hay ninguna decisión que tomar ahora. Puedes dejar de revisar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[20rem] flex-col rounded-2xl border bg-card px-7 py-6">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        La decisión de ahora
      </p>

      <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-balance text-foreground">
        {decision.headline}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-1.5 text-sm">
        <span className="text-muted-foreground">
          Valor expuesto{" "}
          <span className="font-semibold tabular-nums text-foreground">{decision.valueExposed}</span>
        </span>
        <span className="text-muted-foreground">
          Punto de no retorno{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {decision.timeToPointOfNoReturn}
          </span>
        </span>
      </div>

      <div className="mt-6">
        <Button size="lg">Actuar · {decision.recommendedAction}</Button>
      </div>

      <div className="mt-3 flex items-center gap-5 text-sm text-muted-foreground">
        <button type="button" className="transition-colors hover:text-foreground">
          Ver evidencia
        </button>
        <button type="button" className="transition-colors hover:text-foreground">
          Descartar
        </button>
      </div>

      <p className="mt-auto pt-8 text-xs leading-relaxed text-muted-foreground">
        {decision.evidenceLine}
      </p>
    </div>
  )
}
