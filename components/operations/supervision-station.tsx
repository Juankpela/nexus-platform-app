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

/**
 * Orquestador del Vertical Slice. Único componente con estado de UI (selección,
 * captura, ítems ya atendidos): compone los 6 bloques presentacionales dentro de
 * la carcasa `OperationalStation`. No conoce el dominio ni el Read Model — recibe
 * `SupervisionItem[]` (hoy mock) y mapea a las interfaces de cada bloque.
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
}: {
  items: SupervisionItem[]
  health: HealthSnapshot
  belowThresholdCount: number
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actedIds, setActedIds] = useState<string[]>([])
  const [capture, setCapture] = useState<{ action: SupervisionAction; itemId: string } | null>(null)

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

  const requestCapture = (action: SupervisionAction, itemId: string) =>
    setCapture({ action, itemId })

  const confirmCapture = () => {
    if (capture) setActedIds((prev) => [...prev, capture.itemId])
    setCapture(null)
    setSelectedId(null)
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

      {capture ? (
        <CaptureChip
          action={capture.action}
          onCapture={confirmCapture}
          onDismiss={() => setCapture(null)}
        />
      ) : null}
    </>
  )
}
