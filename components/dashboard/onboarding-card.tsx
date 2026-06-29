import Link from "next/link"
import { Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { OnboardingStep } from "@/modules/platform/application/onboarding-flow"

/**
 * Guía de activación de un tenant nuevo: muestra el ÚNICO siguiente paso (de 5)
 * derivado de buildOnboardingFlow. Se eleva por encima de los KPIs cuando el
 * tenant aún no ha cerrado su primera factura, para que el gerente sepa qué hacer.
 * Habla en resultado de negocio. Reutiliza el ADN visual de StartReceivingCard.
 */
export function OnboardingCard({
  step,
  tenantSlug,
}: {
  step: OnboardingStep
  tenantSlug: string
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Rocket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Primeros pasos · Paso {step.stepNumber} de {step.totalSteps}
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{step.body}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completa este paso para poner en marcha tu operación en NEXUS.
          </p>
          <div className="mt-4">
            <Button asChild size="sm" className="gap-1.5">
              <Link href={`/app/${tenantSlug}/${step.ctaSegment}`}>{step.ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
