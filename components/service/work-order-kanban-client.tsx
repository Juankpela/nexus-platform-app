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
import { CalendarClock, GripVertical } from "lucide-react"
import Link from "next/link"
import { startTransition, useOptimistic, useState } from "react"

import { cn } from "@/lib/utils"
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TRANSITIONS,
  type WorkOrder,
  type WorkOrderPriority,
  type WorkOrderStatus,
} from "@/modules/service/domain/work-order"
import { setWorkOrderStatusAction } from "@/modules/service/presentation/work-order-actions"

type ColumnDef = {
  status: WorkOrderStatus
  topBorder: string
  badgeClass: string
  dropRing: string
}

const COLUMNS: ColumnDef[] = [
  { status: "new", topBorder: "border-t-slate-400", badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dropRing: "ring-slate-300" },
  { status: "scheduled", topBorder: "border-t-sky-400", badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", dropRing: "ring-sky-300" },
  { status: "dispatched", topBorder: "border-t-violet-400", badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dropRing: "ring-violet-300" },
  { status: "in_progress", topBorder: "border-t-amber-400", badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dropRing: "ring-amber-300" },
  { status: "on_hold", topBorder: "border-t-orange-400", badgeClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dropRing: "ring-orange-300" },
  { status: "completed", topBorder: "border-t-emerald-500", badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dropRing: "ring-emerald-300" },
  { status: "cancelled", topBorder: "border-t-red-400", badgeClass: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300", dropRing: "ring-red-300" },
]

const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  high: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  critical: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
}

function isTerminal(status: WorkOrderStatus) {
  return WORK_ORDER_STATUS_TRANSITIONS[status].length === 0
}

function fmtDate(iso: string | null): string | null {
  return iso
    ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" })
    : null
}

function CardBody({ wo, dimmed = false }: { wo: WorkOrder; dimmed?: boolean }) {
  const sched = fmtDate(wo.scheduledStart)
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-soft",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {wo.workOrderNumber}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            PRIORITY_COLORS[wo.priority],
          )}
        >
          {WORK_ORDER_PRIORITY_LABELS[wo.priority]}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
        {wo.subject}
      </p>
      {wo.companyName && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {wo.companyName}
          {wo.assetName ? ` · ${wo.assetName}` : ""}
        </p>
      )}
      {sched && (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarClock className="size-3" />
          {sched}
        </p>
      )}
    </div>
  )
}

function DraggableCard({
  wo,
  basePath,
  activeId,
}: {
  wo: WorkOrder
  basePath: string
  activeId: string | null
}) {
  const terminal = isTerminal(wo.status)
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: wo.id,
    data: { wo },
    disabled: terminal,
  })
  const isActive = activeId === wo.id

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
        href={`${basePath}/${wo.id}`}
        tabIndex={isDragging ? -1 : 0}
        className="block transition-all hover:-translate-y-0.5 hover:border-primary/40"
        draggable={false}
        onPointerDown={terminal ? undefined : (e) => e.stopPropagation()}
      >
        <CardBody wo={wo} dimmed={isActive} />
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
  cards: WorkOrder[]
  basePath: string
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[252px] max-w-[252px] flex-col rounded-xl border border-t-[3px] bg-muted/20 transition-shadow",
        topBorder,
        isOver && `ring-2 ring-inset ${dropRing}`,
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-foreground">
            {WORK_ORDER_STATUS_LABELS[status]}
          </span>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold", badgeClass)}>
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
            {isOver ? "Soltar aquí" : "Vacío"}
          </div>
        ) : (
          cards.map((wo) => (
            <DraggableCard key={wo.id} wo={wo} basePath={basePath} activeId={activeId} />
          ))
        )}
      </div>
    </div>
  )
}

export function WorkOrderKanbanClient({
  workOrders: initialWorkOrders,
  basePath,
  tenantSlug,
  canWrite,
}: {
  workOrders: WorkOrder[]
  basePath: string
  tenantSlug: string
  canWrite: boolean
}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const [optimistic, applyOptimistic] = useOptimistic(
    initialWorkOrders,
    (state: WorkOrder[], update: { id: string; status: WorkOrderStatus }) =>
      state.map((w) => (w.id === update.id ? { ...w, status: update.status } : w)),
  )

  const [moveError, setMoveError] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const byStatus = new Map<WorkOrderStatus, WorkOrder[]>()
  for (const col of COLUMNS) byStatus.set(col.status, [])
  for (const wo of optimistic) {
    const col = byStatus.get(wo.status) ?? []
    col.push(wo)
    byStatus.set(wo.status, col)
  }

  const activeWo = activeId
    ? (optimistic.find((w) => w.id === activeId) ?? null)
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setMoveError(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const woId = active.id as string
    const targetStatus = over.id as WorkOrderStatus
    const wo = optimistic.find((w) => w.id === woId)
    if (!wo || wo.status === targetStatus) return

    const allowed = WORK_ORDER_STATUS_TRANSITIONS[wo.status]
    if (!allowed.includes(targetStatus)) {
      setMoveError(
        `No se puede mover de "${WORK_ORDER_STATUS_LABELS[wo.status]}" a "${WORK_ORDER_STATUS_LABELS[targetStatus]}".`,
      )
      return
    }

    startTransition(async () => {
      applyOptimistic({ id: woId, status: targetStatus })
      const fd = new FormData()
      fd.set("tenantSlug", tenantSlug)
      fd.set("id", woId)
      fd.set("status", targetStatus)
      const result = await setWorkOrderStatusAction({ error: null, ok: false }, fd)
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          {activeWo ? (
            <div className="w-[252px] rotate-1 opacity-95 shadow-soft-lg">
              <CardBody wo={activeWo} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
