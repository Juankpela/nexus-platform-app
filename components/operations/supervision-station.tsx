"use client"

import { useState } from "react"

import { ActionBar, type SupervisionAction } from "@/components/operations/action-bar"
import { CaptureChip } from "@/components/operations/capture-chip"
import { DecisionCard, type Decision } from "@/components/operations/decision-card"
import { EvidencePanel } from "@/components/operations/evidence-panel"
import { HealthStrip, type HealthSnapshot } from "@/components/operations/health-strip"
import { OperationalStation } from "@/components/operations/operational-station"
import { SupervisionQueue, type QueueLine } from "@/components/operations/supervision-queue"
import type { SupervisionItem } from "@/components/operations/mock"
import type {
  DecisionSnapshot,
  SupervisionDecisionDraft,
} from "@/modules/supervision/domain/decision-event"

/**
 * Orquestador del Vertical Slice. Único componente con estado de UI (selección,
 * captura, ítems ya atendidos) y el ÚNICO que persiste: al confirmar la captura
 * registra la decisión en el Decision Ledger (server action inyectada como prop).
 * Si la escritura falla, informa el error y NO avanza (no simula éxito).
 */
function toDecision(item: SupervisionItem): Decision {
  return {
    headline: item.headline,
    valueExposed: item.valueExposed,
    timeToPointOfNoReturn: item.timeToPointOfNoReturn,
    recommendedAction: item.recommendedAction,
    evidenceLine: item.evidenceLine,
  }
}

function toLine(item: SupervisionItem): QueueLine {
  return {
    id: item.id,
    commitment: item.commitment,
    valueExposed: item.valueExposed,
    timeToPointOfNoReturn: item.timeToPointOfNoReturn,
    reasonWord: item.reasonWord,
    recommendedAction: item.recommendedAction,
    tone: item.tone,
  }
}

export function SupervisionStation({
  items,
  health,
  belowThresholdCount,
  tenantSlug,
  snapshots,
  recordDecision,
}: {
  items: SupervisionItem[]
  health: HealthSnapshot
  belowThresholdCount: number
  tenantSlug: string
  snapshots: Record<string, DecisionSnapshot>
  recordDecision: (tenantSlug: string, draft: SupervisionDecisionDraft) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actedIds, setActedIds] = useState<string[]>([])
  const [capture, setCapture] = useState<{ action: SupervisionAction; itemId: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lo vivo: el ranking sin los compromisos ya atendidos (el Hero "avanza").
  const live = items.filter((i) => !actedIds.includes(i.id))
  const heroItem = live[0] ?? null
  const queueItems = live.slice(1)
  const focused = selectedId ? live.find((i) => i.id === selectedId) ?? null : null

  // Silencio: sin compromisos vivos no hay nada expuesto en ventana, así que la
  // franja de Salud pasa a calmado (expuesto $0, tendencia estable) y toda la
  // pantalla comunica estabilidad, coherente con el Hero "Todo protegido".
  const healthForView: HealthSnapshot =
    live.length === 0
      ? { ...health, exposedInWindow: "$0", trend: "flat", tone: "calm" }
      : health

  const requestCapture = (action: SupervisionAction, itemId: string) => {
    setError(null)
    setCapture({ action, itemId })
  }

  // Registra la decisión en el Ledger. Solo al confirmar la escritura se avanza.
  const confirmCapture = async (reason: string, priorIntent: string) => {
    if (!capture || saving) return
    const snapshot = snapshots[capture.itemId]
    if (!snapshot) {
      setError("No se encontró el estado del compromiso para registrar la decisión.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await recordDecision(tenantSlug, {
        workOrderId: capture.itemId,
        action: capture.action,
        reason,
        priorIntent,
        snapshot,
      })
      setActedIds((prev) => [...prev, capture.itemId])
      setCapture(null)
      setSelectedId(null)
    } catch {
      setError("No se pudo registrar la decisión. Reinténtalo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <OperationalStation
        health={<HealthStrip snapshot={healthForView} dimmed={!!focused} />}
        hero={
          <DecisionCard
            decision={heroItem ? toDecision(heroItem) : null}
            dimmed={!!focused}
            onAct={heroItem ? () => requestCapture("reasignar", heroItem.id) : undefined}
            onSeeEvidence={heroItem ? () => setSelectedId(heroItem.id) : undefined}
            onDismiss={heroItem ? () => requestCapture("descartar", heroItem.id) : undefined}
          />
        }
        queue={
          focused ? (
            <EvidencePanel
              commitment={focused.commitment}
              evidence={focused.evidence}
              onBack={() => setSelectedId(null)}
            >
              <ActionBar onAction={(action) => requestCapture(action, focused.id)} />
            </EvidencePanel>
          ) : (
            <SupervisionQueue
              lines={queueItems.map(toLine)}
              belowThresholdCount={belowThresholdCount}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )
        }
      />

      {error ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="pointer-events-auto rounded-xl border border-red-200/70 bg-card px-4 py-2 text-sm text-red-600 shadow-lg dark:border-red-900/40 dark:text-red-400">
            {error}
          </div>
        </div>
      ) : null}

      {capture ? (
        <CaptureChip
          action={capture.action}
          onCapture={confirmCapture}
          onDismiss={() => {
            setCapture(null)
            setError(null)
          }}
          pending={saving}
        />
      ) : null}
    </>
  )
}
