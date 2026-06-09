// Pure presentation helpers for the Mission Control dashboard.
// No domain, no queries — just derives the greeting and the prioritized
// "attention center" from already-computed stats.

export type Greeting = "Buenos días" | "Buenas tardes" | "Buenas noches"

/** Time-of-day greeting from an hour (0–23). */
export function greetingFor(hour: number): Greeting {
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export type AttentionSeverity = "critical" | "warning" | "info"

export type AttentionItem = {
  key: string
  label: string
  count: number
  severity: AttentionSeverity
  /** Segment to link to (page builds the full href). */
  segment: string
}

const SEVERITY_WEIGHT: Record<AttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

export type AttentionInput = {
  breachedCases: number
  criticalCases: number
  overloadedTechnicians: number
  unscheduledWorkOrders: number
}

/**
 * Builds the prioritized attention list from existing stats. Only items with
 * count > 0 are surfaced, sorted by severity then count (most urgent first).
 */
export function buildAttentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [
    {
      key: "sla_breached",
      label: "SLA de casos incumplidos",
      count: input.breachedCases,
      severity: "critical",
      segment: "cases",
    },
    {
      key: "critical_cases",
      label: "Casos críticos",
      count: input.criticalCases,
      severity: "critical",
      segment: "cases",
    },
    {
      key: "overloaded_technicians",
      label: "Técnicos sobrecargados",
      count: input.overloadedTechnicians,
      severity: "warning",
      segment: "dispatch",
    },
    {
      key: "unscheduled_work_orders",
      label: "Órdenes sin programar",
      count: input.unscheduledWorkOrders,
      severity: "warning",
      segment: "work-orders",
    },
  ]

  return items
    .filter((i) => i.count > 0)
    .sort((a, b) => {
      const bySeverity = SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]
      return bySeverity !== 0 ? bySeverity : b.count - a.count
    })
}
