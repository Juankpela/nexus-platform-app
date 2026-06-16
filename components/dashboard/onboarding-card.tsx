import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  buildOnboardingFlow,
  type OnboardingCounts,
} from "@/modules/platform/application/onboarding-flow"

/**
 * "Configura tu operación" — guides a new tenant to its first invoice, one step
 * at a time. Progress is derived from `counts` (loaded by the dashboard); no
 * persistence. Speaks in business outcomes, never module names.
 */
export function OnboardingCard({
  base,
  counts,
}: {
  base: string
  counts: OnboardingCounts
}) {
  const flow = buildOnboardingFlow(counts)

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Configura tu operación
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {flow.status === "in_progress"
              ? "Te ayudaremos a poner tu negocio en marcha paso a paso."
              : "Ya tienes clientes, técnicos, trabajos, cotizaciones y facturas en NEXUS."}
          </p>
        </div>
        {flow.status === "in_progress" ? (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Paso {flow.step.stepNumber} de {flow.step.totalSteps}
          </span>
        ) : null}
      </div>

      {flow.status === "in_progress" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium text-foreground">{flow.step.body}</p>
          <Button asChild size="sm">
            <Link href={`${base}/${flow.step.ctaSegment}`}>
              {flow.step.ctaLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm font-medium text-foreground">
            🎉 Tu operación está lista
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Clientes", value: counts.clientes },
              { label: "Técnicos", value: counts.tecnicos },
              { label: "Trabajos", value: counts.trabajos },
              { label: "Cotizaciones", value: counts.cotizaciones },
              { label: "Facturas", value: counts.facturas },
            ].map((m) => (
              <div key={m.label} className="rounded-lg border bg-muted/20 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{m.label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </div>
  )
}
