/**
 * Línea de vida canónica de una solicitud de servicio. UNA sola historia humana
 * (9 hitos) derivada de las máquinas de estado existentes (Case → Work Order →
 * Assignment → Execution → Invoice → Pago). Es una función PURA: no consulta nada;
 * recibe timestamps/flags ya resueltos. Se reusa idéntica en la página pública de
 * seguimiento, en el detalle de Work Order y en Coordinación, de modo que cliente,
 * supervisor y técnico ven el MISMO relato sin inconsistencias.
 */

export type MilestoneState = "done" | "current" | "pending" | "blocked"

export type LifecycleMilestone = {
  key: string
  label: string
  state: MilestoneState
  /** Momento en que ocurrió el hito (ISO), o null si aún no. */
  at: string | null
  /** Detalle opcional (ej. técnico + horario en "Coordinado", motivo si "blocked"). */
  detail: string | null
}

export type ServiceLifecycleInput = {
  /** Case creado (intake). Siempre presente. */
  reportedAt: string
  /** Coordinación de Nexus: WO/asignación creada. */
  coordinatedAt: string | null
  technicianName: string | null
  /** Horario recomendado/agendado (lo que Nexus entrega al agendar). */
  scheduledStart: string | null
  acceptedAt: string | null
  /** Aviso "en camino" enviado (acción lateral; viene de auditoría). */
  enRouteAt: string | null
  arrivedAt: string | null
  startedAt: string | null
  completedAt: string | null
  /** Ejecución marcada como no completable + su motivo legible. */
  unableAt: string | null
  unableReason: string | null
  invoiceIssuedAt: string | null
  paidAt: string | null
  /** Work Order cancelada (terminal). */
  cancelled?: boolean
}

const MILESTONE_KEYS = [
  "reported",
  "coordinated",
  "accepted",
  "en_route",
  "on_site",
  "working",
  "completed",
  "invoiced",
  "paid",
] as const

const LABELS: Record<(typeof MILESTONE_KEYS)[number], string> = {
  reported: "Reporte recibido",
  coordinated: "Coordinado por Nexus",
  accepted: "Técnico confirmó",
  en_route: "Técnico en camino",
  on_site: "Técnico en sitio",
  working: "Trabajo en curso",
  completed: "Trabajo completado",
  invoiced: "Factura emitida",
  paid: "Pago recibido",
}

function scheduleDetail(technicianName: string | null, scheduledStart: string | null): string | null {
  const parts: string[] = []
  if (technicianName) parts.push(technicianName)
  if (scheduledStart) parts.push(`agendado para ${formatWhen(scheduledStart)}`)
  return parts.length > 0 ? parts.join(" · ") : null
}

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]

/**
 * Fecha humana es-CO (zona Bogotá), corta. Pura: usa un Date a partir del ISO.
 *
 * Caso especial: una fecha-solo "YYYY-MM-DD" (factura/pago) NO lleva hora ni zona.
 * Si la pasáramos por `new Date(...)` se interpreta como medianoche UTC y al
 * renderizar en Bogotá (UTC-5) retrocede al día anterior. Por eso la formateamos
 * directamente desde sus componentes, sin construir un Date con zona.
 */
export function formatWhen(iso: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (dateOnly) {
    const [, , month, day] = dateOnly
    return `${Number(day)} ${MONTHS_ES[Number(month) - 1]}`
  }
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Construye los 9 hitos. Reglas:
 *  - Un hito está "done" si tiene su timestamp O si un hito posterior ya ocurrió
 *    (monotonía: aceptar implica que se reportó, aunque falte algún sello).
 *  - El primer hito no cumplido es el "current".
 *  - Si la ejecución quedó "no completable", el hito en curso se marca "blocked".
 *  - Si la WO fue cancelada, el hito en curso se marca "blocked: Cancelada".
 */
export function buildServiceLifecycle(input: ServiceLifecycleInput): LifecycleMilestone[] {
  const at: Record<(typeof MILESTONE_KEYS)[number], string | null> = {
    reported: input.reportedAt,
    coordinated: input.coordinatedAt,
    accepted: input.acceptedAt,
    en_route: input.enRouteAt,
    on_site: input.arrivedAt,
    working: input.startedAt,
    completed: input.completedAt,
    invoiced: input.invoiceIssuedAt,
    paid: input.paidAt,
  }

  // Monotonía: marca alcanzado si tiene sello propio o alguno posterior lo tiene.
  const reached: boolean[] = MILESTONE_KEYS.map((k) => at[k] != null)
  for (let i = reached.length - 2; i >= 0; i--) {
    if (reached[i + 1]) reached[i] = true
  }

  const currentIndex = reached.findIndex((r) => !r)
  const blockedReason = input.cancelled
    ? "Cancelada"
    : input.unableAt
      ? input.unableReason ?? "No se pudo completar"
      : null

  return MILESTONE_KEYS.map((key, i) => {
    let state: MilestoneState
    if (reached[i]) state = "done"
    else if (i === currentIndex) state = blockedReason ? "blocked" : "current"
    else state = "pending"

    const detail =
      key === "coordinated"
        ? scheduleDetail(input.technicianName, input.scheduledStart)
        : state === "blocked"
          ? blockedReason
          : null

    return { key, label: LABELS[key], state, at: at[key], detail }
  })
}
