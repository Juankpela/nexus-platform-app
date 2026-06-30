import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

/**
 * Evidencia (BLUEPRINT_ESTACION capa 4). Razonamiento auditable —no IA mágica—
 * para validar antes de actuar. Se siente como una EXPLICACIÓN, no un log:
 * prosa legible, interlineado generoso, incertidumbre siempre visible.
 * La ActionBar (capa 5) entra como `children` al pie. Presentacional puro.
 */
export interface Evidence {
  /** Observado: hechos presentes (solo observables, sin leakage). */
  observed: string[]
  /** Concluido: trayectoria → punto de no retorno → incumple. */
  concluded: string
  /** Incertidumbre: lo que NEXUS no sabe; confianza declarada. */
  uncertainty: string
  /** Acción propuesta. */
  proposedAction: string
  /** Factibilidad: ¿hay slack para ejecutarla? */
  feasibility: string
  /** Si no se hace nada: resultado proyectado + valor perdido. */
  ifNothing: string
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  )
}

export function EvidencePanel({
  commitment,
  evidence,
  onBack,
  children,
}: {
  commitment: string
  evidence: Evidence
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Volver a la cola
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        <h2 className="text-base font-semibold leading-snug text-foreground">{commitment}</h2>

        <Block label="Observado">
          <ul className="space-y-1">
            {evidence.observed.map((fact, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block label="Concluido">{evidence.concluded}</Block>

        <Block label="Incertidumbre">
          <span className="text-muted-foreground">{evidence.uncertainty}</span>
        </Block>

        <Block label="Acción propuesta">
          <p className="font-medium text-foreground">{evidence.proposedAction}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{evidence.feasibility}</p>
        </Block>

        <Block label="Si no se hace nada">
          <span className="text-orange-600 dark:text-orange-400">{evidence.ifNothing}</span>
        </Block>
      </div>

      {children ? <div className="border-t px-5 py-4">{children}</div> : null}
    </div>
  )
}
