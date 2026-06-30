"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SupervisionAction } from "@/components/operations/action-bar"

/**
 * Aprendizaje (BLUEPRINT_ESTACION capa 6). Captura efímera, fricción casi nula:
 * tras una acción pregunta "¿por qué?" con chips de un tap. Nunca bloquea.
 * Construye evidencia (no entrena IA). Presentacional puro + estado local de UI.
 */
const ACTION_LABEL: Record<SupervisionAction, string> = {
  reasignar: "Reasignaste el recurso",
  expeditar: "Expeditaste el compromiso",
  renegociar: "Renegociaste el plazo",
  escalar: "Escalaste el compromiso",
  descartar: "Descartaste la alerta",
}

const REASONS: Record<SupervisionAction, string[]> = {
  reasignar: ["Mejor recurso disponible", "Carga desbalanceada", "Conocimiento tácito"],
  expeditar: ["Cliente clave", "Ventana cerrando", "Valor alto"],
  renegociar: ["Plazo irreal", "Acordado con cliente", "Sin capacidad"],
  escalar: ["Excede mi esfera", "Requiere aprobación", "Riesgo alto"],
  descartar: ["Falso positivo", "Ya resuelto", "NEXUS no lo sabía"],
}

export function CaptureChip({
  action,
  onCapture,
  onDismiss,
}: {
  action: SupervisionAction
  onCapture: (reason: string) => void
  onDismiss: () => void
}) {
  const [reason, setReason] = useState<string | null>(null)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border bg-card px-4 py-3 shadow-lg">
        <span className="text-xs text-muted-foreground">
          {ACTION_LABEL[action]} · <span className="text-foreground">¿por qué?</span>
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {REASONS[action].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                reason === r
                  ? "border-nexus-blue bg-nexus-blue/10 text-nexus-blue"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="ml-1"
          disabled={!reason}
          onClick={() => reason && onCapture(reason)}
        >
          Listo
        </Button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Omitir"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
