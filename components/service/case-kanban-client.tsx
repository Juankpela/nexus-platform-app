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
import { GripVertical } from "lucide-react"
import Link from "next/link"
import { startTransition, useOptimistic, useState } from "react"

import { SlaBadge } from "@/components/service/sla-badge"
import { cn } from "@/lib/utils"
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  CASE_STATUS_TRANSITIONS,
  type Case,
  type CasePriority,
  type CaseStatus,
} from "@/modules/service/domain/case"
import { setCaseStatusAction } from "@/modules/service/presentation/case-actions"

type ColumnDef = {
  status: CaseStatus
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
    status: "working",
    topBorder: "border-t-sky-400",
    badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    dropRing: "ring-sky-300",
  },
  {
    status: "waiting_customer",
    topBorder: "border-t-indigo-400",
    badgeClass: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    dropRing: "ring-indigo-300",
  },
  {
    status: "escalated",
    topBorder: "border-t-orange-400",
    badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    dropRing: "ring-orange-300",
  },
  {
    status: "resolved",
    topBorder: "border-t-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dropRing: "ring-emerald-300",
  },
  {
    status: "closed",
    topBorder: "border-t-slate-400",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dropRing: "ring-slate-300",
  },
]

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

function isTerminal(status: CaseStatus) {
  return CASE_STATUS_TRANSITIONS[status].length === 0
}

function CardBody({ c, dimmed = false }: { c: Case; dimmed?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-soft",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {c.caseNumber}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_COLORS[c.priority],
          )}
        >
          {CASE_PRIORITY_LABELS[c.priority]}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
        {c.subject}
      </p>
      {c.companyName && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {c.companyName}
          {c.contactName ? ` · ${c.contactName}` : ""}
        </p>
      )}
      <div className="mt-2.5">
        <SlaBadge
          slaDueAt={c.slaDueAt}
          priority={c.priority}
          resolvedAt={c.resolvedAt}
          closedAt={c.closedAt}
        />
      </div>
    </div>
  )
}

function DraggableCard({
  c,
  basePath,
  activeId,
}: {
  c: Case
  basePath: string
  activeId: string | null
}) {
  const terminal = isTerminal(c.status)
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: c.id,
    data: { c },
    disabled: terminal,
  })
  const isActive = activeId === c.id

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative",
        !terminal && "cursor-grab active:cursor-grabbing",
        terminal && "cursor-default",
      )}
      style={{ touchAction: "none" }}
    >
      {!terminal && (
        <span
          {...listeners}
          {...attributes}
          className="absolute -left-1 top-1/2 z-10 hidden -translate-y-1/2 cursor-grab text-muted-foreground/40 hover:text-muted-foreground group-hover:flex"
          aria-label="Arrastrar"
        >
          <GripVertical className="size-3.5" />
        </span>
      )}

      <Link
        href={`${basePath}/${c.id}`}
        tabIndex={isDragging ? -1 : 0}
        className="block transition-all hover:-translate-y-0.5 hover:border-primary/40"
        draggable={false}
        onPointerDown={terminal ? undefined : (e) => e.stopPropagation()}
      >
        <CardBody c={c} dimmed={isActive} />
      </Link>

      {!terminal && (
        <div
          {...listeners}
          {...attributes}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          aria-hidden
          style={{ touchAction: "none" }}
        />
      )}
    </div>
  )
}

function DroppableColumn({
  status,
  topBorder,
  badgeClass,
  dropRing,
  cards,
  basePath,
  activeId,
}: ColumnDef & {
  cards: Case[]
  basePath: string
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[264px] max-w-[264px] flex-col rounded-xl border border-t-[3px] bg-muted/20 transition-shadow",
        topBorder,
        isOver && `ring-2 ring-inset ${dropRing}`,
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-foreground">
            {CASE_STATUS_LABELS[status]}
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
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {cards.length === 0 ? (
          <div
            className={cn(
              "mx-1 flex-1 rounded-lg border-2 border-dashed border-transparent py-8 text-center text-xs text-muted-foreground/50 transition-colors",
              isOver && "border-muted-foreground/30 bg-muted/30",
            )}
          >
            {isOver ? "Soltar aquí" : "Sin casos"}
          </div>
        ) : (
          cards.map((c) => (
            <DraggableCard
              key={c.id}
              c={c}
              basePath={basePath}
              activeId={activeId}
            />
          ))
        )}
      </div>
    </div>
  )
}

export function CaseKanbanClient({
  cases: initialCases,
  basePath,
  tenantSlug,
  canWrite,
}: {
  cases: Case[]
  basePath: string
  tenantSlug: string
  canWrite: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const [optimisticCases, applyOptimistic] = useOptimistic(
    initialCases,
    (state: Case[], update: { id: string; status: CaseStatus }) =>
      state.map((c) => (c.id === update.id ? { ...c, status: update.status } : c)),
  )

  const [moveError, setMoveError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const byStatus = new Map<CaseStatus, Case[]>()
  for (const col of COLUMNS) byStatus.set(col.status, [])
  for (const c of optimisticCases) {
    const col = byStatus.get(c.status) ?? []
    col.push(c)
    byStatus.set(c.status, col)
  }

  const activeCase = activeId
    ? (optimisticCases.find((c) => c.id === activeId) ?? null)
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setMoveError(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const caseId = active.id as string
    const targetStatus = over.id as CaseStatus
    const c = optimisticCases.find((x) => x.id === caseId)
    if (!c || c.status === targetStatus) return

    const allowed = CASE_STATUS_TRANSITIONS[c.status]
    if (!allowed.includes(targetStatus)) {
      setMoveError(
        `No se puede mover de "${CASE_STATUS_LABELS[c.status]}" a "${CASE_STATUS_LABELS[targetStatus]}".`,
      )
      return
    }

    startTransition(async () => {
      applyOptimistic({ id: caseId, status: targetStatus })

      const fd = new FormData()
      fd.set("tenantSlug", tenantSlug)
      fd.set("id", caseId)
      fd.set("status", targetStatus)
      const result = await setCaseStatusAction({ error: null, ok: false }, fd)
      if (result.error) setMoveError(result.error)
    })
  }

  return (
    <div className="space-y-3">
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: "68vh" }}>
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

        <DragOverlay dropAnimation={null}>
          {activeCase ? (
            <div className="w-[264px] rotate-1 opacity-95 shadow-soft-lg">
              <CardBody c={activeCase} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
