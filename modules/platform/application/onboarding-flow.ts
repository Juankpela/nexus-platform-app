/**
 * Activation flow for a new tenant: derives the single next recommended step
 * from counts the dashboard already loads. No persistence — progress is purely a
 * function of existing data. Speaks in business outcomes, not module names.
 */

export type OnboardingCounts = {
  clientes: number
  tecnicos: number
  trabajos: number
  cotizaciones: number
  facturas: number
}

export type OnboardingStep = {
  /** 1-based position in the 5-step sequence. */
  stepNumber: number
  totalSteps: number
  body: string
  ctaLabel: string
  /** Path segment under /app/{slug}; the card builds the full href. */
  ctaSegment: string
}

export type OnboardingFlow =
  | { status: "in_progress"; step: OnboardingStep }
  | { status: "done" }

const STEPS: Array<{
  body: string
  ctaLabel: string
  ctaSegment: string
  isDone: (c: OnboardingCounts) => boolean
}> = [
  {
    body: "Importa o registra tus primeros clientes.",
    ctaLabel: "Importar clientes",
    ctaSegment: "companies",
    isDone: (c) => c.clientes > 0,
  },
  {
    body: "Registra tu equipo técnico.",
    ctaLabel: "Crear técnico",
    ctaSegment: "technicians",
    isDone: (c) => c.tecnicos > 0,
  },
  {
    body: "Crea tu primer trabajo.",
    ctaLabel: "Crear orden",
    ctaSegment: "work-orders",
    isDone: (c) => c.trabajos > 0,
  },
  {
    body: "Envía tu primera cotización.",
    ctaLabel: "Ir a cotizaciones",
    ctaSegment: "quotes",
    isDone: (c) => c.cotizaciones > 0,
  },
  {
    body: "Genera tu primera factura.",
    ctaLabel: "Ir a facturación",
    ctaSegment: "invoices",
    isDone: (c) => c.facturas > 0,
  },
]

/** First unmet step, or `done` when the tenant has reached its first invoice. */
export function buildOnboardingFlow(counts: OnboardingCounts): OnboardingFlow {
  const index = STEPS.findIndex((s) => !s.isDone(counts))
  if (index === -1) return { status: "done" }
  const s = STEPS[index]
  return {
    status: "in_progress",
    step: {
      stepNumber: index + 1,
      totalSteps: STEPS.length,
      body: s.body,
      ctaLabel: s.ctaLabel,
      ctaSegment: s.ctaSegment,
    },
  }
}
