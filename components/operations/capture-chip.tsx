"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SupervisionAction } from "@/components/operations/action-bar"

/**
 * Aprendizaje (BLUEPRINT_ESTACION capa 6). Captura efímera tras una acción.
 * Construye evidencia (no entrena IA). Captura DOS cosas para el Decision Ledger:
 *   · contrafactual de Gate-1 ("¿qué ibas a hacer?") → mide el cambio de decisión,
 *   · razón ("¿por qué?").
 * Presentacional puro + estado local de UI.
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

/** Contrafactual: qué habría hecho SIN la decisión que NEXUS hizo visible. */
const PRIOR_INTENT = ["Lo mismo", "Algo distinto", "No lo había visto"]

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        selected
          ? "border-nexus-blue bg-nexus-blue/10 text-nexus-blue"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

export function CaptureChip({
  action,
  onCapture,
  onDismiss,
  pending = false,
}: {
  action: SupervisionAction
  onCapture: (reason: string, priorIntent: string) => void
  onDismiss: () => void
  pending?: boolean
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [priorIntent, setPriorIntent] = useState<string | null>(null)
  const ready = reason != null && priorIntent != null && !pending

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card px-4 py-3 shadow-lg">
        <span className="text-xs text-muted-foreground">{ACTION_LABEL[action]}</span>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">¿Qué ibas a hacer?</span>
          {PRIOR_INTENT.map((p) => (
            <Chip key={p} label={p} selected={priorIntent === p} onClick={() => setPriorIntent(p)} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">¿Por qué?</span>
          {REASONS[action].map((r) => (
            <Chip key={r} label={r} selected={reason === r} onClick={() => setReason(r)} />
          ))}
          <Button
            size="sm"
            className="ml-auto"
            disabled={!ready}
            onClick={() => reason && priorIntent && onCapture(reason, priorIntent)}
          >
            {pending ? "Registrando…" : "Listo"}
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
    </div>
  )
}
