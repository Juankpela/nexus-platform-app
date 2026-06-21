"use client"

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import Link from "next/link"
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import {
  OPPORTUNITY_BUSINESS_TYPE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_TRANSITIONS,
  type Opportunity,
  type OpportunityStatus,
} from "@/modules/crm/domain/opportunity"
import { setOpportunityStatusAction } from "@/modules/crm/presentation/opportunity-actions"

// ── Column definitions ─────────────────────────────────────────────────────

type ColumnDef = {
  status: OpportunityStatus
  topBorder: string
  badgeClass: string
  dropRing: string
}

const COLUMNS: ColumnDef[] = [
  {
    status: "new",
    topBorder: "border-t-slate-400",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dropRing: "ring-slate-300",
  },
  {
    status: "discovery",
    topBorder: "border-t-sky-400",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dropRing: "ring-sky-300",
  },
  {
    status: "proposal",
    topBorder: "border-t-indigo-400",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    dropRing: "ring-indigo-300",
  },
  {
    status: "negotiation",
    topBorder: "border-t-amber-400",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dropRing: "ring-amber-300",
  },
  {
    status: "won",
    topBorder: "border-t-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dropRing: "ring-emerald-300",
  },
  {
    status: "lost",
    topBorder: "border-t-red-400",
    badgeClass: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dropRing: "ring-red-300",
  },
]

const TYPE_COLORS: Record<string, string> = {
  flexography: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  inks:        "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  consumables: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  consulting:  "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  machinery:   "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number | null): string {
  if (v == null || v === 0) return "—"
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v.toLocaleString()}`
}

function isTerminal(status: OpportunityStatus) {
  return OPPORTUNITY_STATUS_TRANSITIONS[status].length === 0
}

// ── Card display (pure, no DnD hooks) ─────────────────────────────────────

function CardContent({
  opp,
  dimmed = false,
}: {
  opp: Opportunity
  dimmed?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-soft",
        dimmed && "opacity-40",
      )}
    >
      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
        {opp.name}
      </p>
      {opp.companyName && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {opp.companyName}
          {opp.contactName ? ` · ${opp.contactName}` : ""}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-1.5">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {fmt(opp.estimatedValue)}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            TYPE_COLORS[opp.businessType] ?? "bg-muted text-muted-foreground",
          )}
        >
          {OPPORTUNITY_BUSINESS_TYPE_LABELS[opp.businessType]}
        </span>
      </div>
      {opp.probability > 0 && opp.probability < 100 && (
        <div className="mt-2.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/50"
              style={{ width: `${opp.probability}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[10px] text-muted-foreground/70">
            {opp.probability}%
          </p>
        </div>
      )}
    </div>
  )
}

// ── Draggable card ─────────────────────────────────────────────────────────

function DraggableCard({
  opp,
  basePath,
  activeId,
}: {
  opp: Opportunity
  basePath: string
  activeId: string | null
}) {
  const terminal = isTerminal(opp.status)
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: opp.id,
    data: { opp },
    disabled: terminal,
  })

  const isActive = activeId === opp.id

  // La tarjeta entera es arrastrable Y clickeable: el `distance: 8` del sensor
  // separa un clic (abre la oportunidad) de un arrastre (mueve de etapa). Marcamos
  // que hubo arrastre para NO navegar en el clic sintético que dispara el navegador
  // al soltar. (Mismo patrón que el Kanban de Work Orders.)
  const draggedRef = useRef(false)
  useEffect(() => {
    if (isDragging) draggedRef.current = true
  }, [isDragging])

  const dragProps = terminal ? {} : { ...listeners, ...attributes }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative",
        !terminal && "cursor-grab active:cursor-grabbing",
        terminal && "cursor-default",
      )}
      style={{ touchAction: "none" }}
    >
      <Link
        href={`${basePath}/${opp.id}`}
        {...dragProps}
        draggable={false}
        tabIndex={isDragging ? -1 : 0}
        onClick={(e) => {
          if (draggedRef.current) {
            e.preventDefault()
            draggedRef.current = false
          }
        }}
        className="block transition-all hover:-translate-y-0.5 hover:border-primary/40"
      >
        <CardContent opp={opp} dimmed={isActive} />
      </Link>
    </div>
  )
}

// ── Droppable column ───────────────────────────────────────────────────────

function DroppableColumn({
  status,
  topBorder,
  badgeClass,
  dropRing,
  cards,
  basePath,
  activeId,
}: ColumnDef & {
  cards: Opportunity[]
  basePath: string
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const colTotal = cards.reduce((s, o) => s + (o.estimatedValue ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[264px] max-w-[264px] flex-col rounded-xl border border-t-[3px] bg-muted/20 transition-shadow",
        topBorder,
        isOver && `ring-2 ring-inset ${dropRing}`,
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-foreground">
            {OPPORTUNITY_STATUS_LABELS[status]}
          </span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
              badgeClass,
            )}
          >
            {cards.length}
          </span>
        </div>
        {colTotal > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground">
            {fmt(colTotal)}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {cards.length === 0 ? (
          <div
            className={cn(
              "mx-1 flex-1 rounded-lg border-2 border-dashed border-transparent py-8 text-center text-xs text-muted-foreground/50 transition-colors",
              isOver && "border-muted-foreground/30 bg-muted/30",
            )}
          >
            {isOver ? "Soltar aquí" : "Sin oportunidades"}
          </div>
        ) : (
          cards.map((opp) => (
            <DraggableCard
              key={opp.id}
              opp={opp}
              basePath={basePath}
              activeId={activeId}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Main client component ──────────────────────────────────────────────────

export function OpportunityKanbanClient({
  opportunities: initialOpportunities,
  basePath,
  tenantSlug,
  canWrite,
}: {
  opportunities: Opportunity[]
  basePath: string
  tenantSlug: string
  canWrite: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // useOptimistic: optimistically reorder cards between columns
  const [optimisticOpps, applyOptimistic] = useOptimistic(
    initialOpportunities,
    (
      state: Opportunity[],
      update: { id: string; status: OpportunityStatus },
    ) => state.map((o) => (o.id === update.id ? { ...o, status: update.status } : o)),
  )

  // Error banner (server-side rejection, e.g. invalid transition)
  const [moveError, setMoveError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  // Group by status for rendering
  const byStatus = new Map<OpportunityStatus, Opportunity[]>()
  for (const col of COLUMNS) byStatus.set(col.status, [])
  for (const opp of optimisticOpps) {
    const col = byStatus.get(opp.status) ?? []
    col.push(opp)
    byStatus.set(opp.status, col)
  }

  const activeOpp = activeId
    ? optimisticOpps.find((o) => o.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setMoveError(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const oppId = active.id as string
    const targetStatus = over.id as OpportunityStatus
    const opp = optimisticOpps.find((o) => o.id === oppId)
    if (!opp || opp.status === targetStatus) return

    // Validate transition (won/lost are terminal — shouldn't be draggable anyway)
    const allowed = OPPORTUNITY_STATUS_TRANSITIONS[opp.status]
    if (!allowed.includes(targetStatus)) {
      setMoveError(
        `No se puede mover de "${OPPORTUNITY_STATUS_LABELS[opp.status]}" a "${OPPORTUNITY_STATUS_LABELS[targetStatus]}".`,
      )
      return
    }

    // Optimistic update + server action
    startTransition(async () => {
      applyOptimistic({ id: oppId, status: targetStatus })

      const fd = new FormData()
      fd.set("tenantSlug", tenantSlug)
      fd.set("id", oppId)
      fd.set("status", targetStatus)
      const result = await setOpportunityStatusAction(
        { error: null, ok: false },
        fd,
      )
      if (result.error) setMoveError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {moveError && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <span>{moveError}</span>
          <button
            onClick={() => setMoveError(null)}
            className="ml-4 text-destructive/60 hover:text-destructive"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-6"
          style={{ minHeight: "68vh" }}
        >
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.status}
              {...col}
              cards={byStatus.get(col.status) ?? []}
              basePath={basePath}
              activeId={canWrite ? activeId : null}
            />
          ))}
        </div>

        {/* Floating card while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeOpp ? (
            <div className="w-[264px] rotate-1 opacity-95 shadow-soft-lg">
              <CardContent opp={activeOpp} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
