import type { ReactNode } from "react"

/**
 * Carcasa de la Estación de Supervisión (BLUEPRINT_ESTACION §1, §3).
 *
 * Layout PURO: recibe las regiones como slots y las distribuye según la
 * jerarquía congelada — Salud (franja calma arriba) · Hero dominante · Cola en
 * riel. No conoce el dominio, no obtiene datos, no decide nada. Solo coloca.
 *
 * Evidencia, ActionBar y LearningCapture son contextuales (aparecen al
 * seleccionar / al actuar), por eso no son slots estáticos de la carcasa;
 * llegan en sus propios PR.
 */
export function OperationalStation({
  health,
  hero,
  queue,
}: {
  health: ReactNode
  hero: ReactNode
  queue: ReactNode
}) {
  return (
    <div className="space-y-6 px-5 py-6 sm:px-8">
      {/* Capa 2 · Salud operacional — franja calma, peso visual mínimo */}
      <section aria-label="Salud operacional">{health}</section>

      {/* Capa 1 (dominante) + Capa 3 (riel) — el Hero domina; la cola es secundaria */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section aria-label="La decisión de ahora">{hero}</section>
        <section aria-label="Cola de supervisión">{queue}</section>
      </div>
    </div>
  )
}
