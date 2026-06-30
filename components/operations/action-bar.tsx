import { Button } from "@/components/ui/button"

/**
 * Acción (BLUEPRINT_ESTACION capa 5). Pocas, presentes en el momento de decidir,
 * cada una cambia la operación. Reasignar es la recomendada (único primario);
 * Descartar exige razón (la captura la pide después). Presentacional puro.
 */
export type SupervisionAction =
  | "reasignar"
  | "expeditar"
  | "renegociar"
  | "escalar"
  | "descartar"

const ACTIONS: { key: SupervisionAction; label: string }[] = [
  { key: "expeditar", label: "Expeditar" },
  { key: "renegociar", label: "Renegociar plazo" },
  { key: "escalar", label: "Escalar" },
]

export function ActionBar({ onAction }: { onAction: (action: SupervisionAction) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="lg" onClick={() => onAction("reasignar")}>
        Reasignar recurso
      </Button>
      {ACTIONS.map((a) => (
        <Button key={a.key} variant="outline" size="lg" onClick={() => onAction(a.key)}>
          {a.label}
        </Button>
      ))}
      <Button variant="ghost" size="lg" className="ml-auto text-muted-foreground" onClick={() => onAction("descartar")}>
        Descartar
      </Button>
    </div>
  )
}
