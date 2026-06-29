import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { OnboardingCounts } from "@/modules/platform/application/onboarding-flow"
import type { UUID } from "@/types/shared"

type CountTable = "companies" | "technicians" | "work_orders" | "quotes" | "invoices"

/**
 * Conteos mínimos que alimentan buildOnboardingFlow. Cinco `head:true` counts
 * (sin traer filas), tenant-scoped. Reutiliza el patrón de conteo ya usado en
 * inventory. No es un dashboard: es el dato para decidir el "siguiente paso".
 */
export async function getOnboardingCounts(tenantId: UUID): Promise<OnboardingCounts> {
  const client = await createServerSupabaseClient()
  const countOf = async (table: CountTable) => {
    const { count } = await client
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
    return count ?? 0
  }

  const [clientes, tecnicos, trabajos, cotizaciones, facturas] = await Promise.all([
    countOf("companies"),
    countOf("technicians"),
    countOf("work_orders"),
    countOf("quotes"),
    countOf("invoices"),
  ])

  return { clientes, tecnicos, trabajos, cotizaciones, facturas }
}
