import { ArrowRight } from "lucide-react"

/**
 * Cola de supervisión (BLUEPRINT_ESTACION capa 3). Líneas de decisión —no filas
 * de tabla—, ordenadas por impacto (no cronológico). Cada línea muestra solo lo
 * necesario para decidir actuar-o-no. Bajo umbral, se colapsa. Presentacional puro.
 */
export interface QueueLine {
  id: string
  /** Compromiso (etiqueta corta). */
  commitment: string
  valueExposed: string
  timeToPointOfNoReturn: string
  /** El porqué en una palabra. */
  reasonWord: string
  recommendedAction: string
  /** Urgencia: tensión (cálido) o vigilancia (frío). */
  tone: "tension" | "watch"
}

function QueueItem({
  line,
  selected,
  onSelect,
}: {
  line: QueueLine
  selected: boolean
  onSelect: (id: string) => void
}) {
  const accentBar = line.tone === "tension" ? "bg-orange-500" : "bg-nexus-blue/60"
  return (
    <button
      type="button"
      onClick={() => onSelect(line.id)}
      aria-pressed={selected}
      className={`flex w-full items-stretch gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
        selected ? "bg-muted/50" : ""
      }`}
    >
      <span className={`w-0.5 shrink-0 rounded-full ${accentBar}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-foreground">{line.commitment}</span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {line.valueExposed}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">
            {line.reasonWord} · <span className="tabular-nums">{line.timeToPointOfNoReturn}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-nexus-blue">
            {line.recommendedAction} <ArrowRight className="size-3" />
          </span>
        </span>
      </span>
    </button>
  )
}

export function SupervisionQueue({
  lines,
  belowThresholdCount,
  selectedId,
  onSelect,
}: {
  lines: QueueLine[]
  belowThresholdCount: number
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Cola de supervisión
        </h2>
        {lines.length > 0 ? (
          <span className="text-xs tabular-nums text-muted-foreground">{lines.length}</span>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <p className="px-4 pb-4 pt-1 text-sm text-muted-foreground">
          La cola está despejada. Nada más en ventana accionable.
        </p>
      ) : (
        <div className="divide-y">
          {lines.map((line) => (
            <QueueItem
              key={line.id}
              line={line}
              selected={line.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {belowThresholdCount > 0 ? (
        <details className="border-t">
          <summary className="cursor-pointer px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            {belowThresholdCount} más bajo el umbral
          </summary>
          <p className="px-4 pb-3 text-xs leading-relaxed text-muted-foreground">
            Compromisos de bajo valor o urgencia. No se persiguen para preservar la atención del
            supervisor (disciplina de falsos positivos).
          </p>
        </details>
      ) : null}
    </div>
  )
}
