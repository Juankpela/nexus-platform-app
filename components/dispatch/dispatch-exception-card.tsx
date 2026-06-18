import { AlertTriangle, PauseCircle } from "lucide-react"

export type DispatchExceptionView = {
  caseId: string
  caseNumber: string
  subject: string
  priority: string
  verdict: "HOLD" | "ESCALATE"
  skillLabel: string | null
  confidenceScore: number
  reasons: string[]
  suggestedAction: string
}

/**
 * Tarjeta de excepción de despacho (H2): hace visible un caso que el motor NO
 * pudo despachar. Solo lectura: muestra qué falló, por qué y la acción sugerida.
 */
export function DispatchExceptionCard({ exception }: { exception: DispatchExceptionView }) {
  const escalate = exception.verdict === "ESCALATE"
  const tone = escalate
    ? "border-red-200 dark:border-red-900/50"
    : "border-amber-200 dark:border-amber-900/50"
  const badge = escalate
    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  const Icon = escalate ? AlertTriangle : PauseCircle

  return (
    <div className={`rounded-xl border bg-card p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{exception.caseNumber}</p>
          <h3 className="truncate font-medium text-foreground">{exception.subject}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {exception.skillLabel ?? "Sin especialidad"} · prioridad {exception.priority}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge}`}>
          <Icon className="size-3.5" />
          {escalate ? "Requiere acción manual" : "Revisar y aprobar"}
        </span>
      </div>

      <div className="mt-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-sm font-medium text-foreground">Por qué no se despachó</p>
        <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
          {exception.reasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-current opacity-60" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          <span className="font-medium text-foreground">Acción sugerida: </span>
          <span className="text-muted-foreground">{exception.suggestedAction}</span>
        </p>
      </div>
    </div>
  )
}
