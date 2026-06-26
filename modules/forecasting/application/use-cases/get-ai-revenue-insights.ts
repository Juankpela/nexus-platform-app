import "server-only"

import { createAnthropicClient } from "@/lib/ai/anthropic-client"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { AiInsight, AiRevenueInsights } from "@/modules/forecasting/domain/ai-insight"
import type { UUID } from "@/types/shared"

export async function getAiRevenueInsights(tenantId: UUID): Promise<AiRevenueInsights> {
  const supabase = await createServerSupabaseClient()

  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, name, status, estimated_value, probability, expected_close_date, created_at, updated_at, companies(name)")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(50)

  const { data: activities } = await supabase
    .from("activities")
    .select("opportunity_id, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(200)

  const activityMap = new Map<string, string>()
  for (const a of activities ?? []) {
    if (a.opportunity_id && !activityMap.has(a.opportunity_id)) {
      activityMap.set(a.opportunity_id, a.created_at)
    }
  }

  const today = new Date()

  const oppSummary = (opps ?? []).map(o => {
    const lastActivity = activityMap.get(o.id)
    const daysSinceActivity = lastActivity
      ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / 86400000)
      : null
    const daysToClose = o.expected_close_date
      ? Math.floor((new Date(o.expected_close_date).getTime() - today.getTime()) / 86400000)
      : null
    const daysSinceCreated = Math.floor((today.getTime() - new Date(o.created_at).getTime()) / 86400000)

    return {
      id: o.id,
      name: o.name,
      company: (o.companies as { name: string } | null)?.name ?? "—",
      status: o.status,
      value: o.estimated_value,
      probability: o.probability,
      daysToClose,
      daysSinceActivity,
      daysSinceCreated,
    }
  })

  const totalPipeline = oppSummary
    .filter(o => ["new","discovery","proposal","negotiation"].includes(o.status))
    .reduce((acc, o) => acc + (o.value ?? 0), 0)

  const prompt = `Eres un analista de ventas senior. Analiza este pipeline y genera insights de negocio concretos.

PIPELINE TOTAL ACTIVO: $${totalPipeline.toLocaleString()} COP
FECHA HOY: ${today.toISOString().split("T")[0]}

OPORTUNIDADES:
${JSON.stringify(oppSummary, null, 2)}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "summary": "Párrafo ejecutivo de 2-3 oraciones sobre el estado del pipeline",
  "forecastScore": <número 0-100>,
  "riskScore": <número 0-100>,
  "insights": [
    {
      "id": "1",
      "type": "high_risk|stalled|revenue_risk|recommended_action|positive_signal",
      "severity": "critical|warning|info|positive",
      "title": "Título corto",
      "description": "Descripción de 1-2 oraciones con dato específico",
      "opportunityId": "<id o null>",
      "opportunityName": "<nombre o null>",
      "estimatedImpact": <valor COP o null>,
      "actionLabel": "Etiqueta CTA o null"
    }
  ]
}

Genera entre 4 y 7 insights. Prioriza:
1. Oportunidades con expected_close_date vencido y status abierto (daysToClose < 0) → critical
2. Oportunidades sin actividad en +30 días → stalled → warning
3. Oportunidades de alto valor con probability < 30% → revenue_risk
4. Oportunidades con probability alta en negotiation → positive_signal
5. Acciones recomendadas concretas → recommended_action

Solo responde con el JSON, sin markdown, sin explicaciones.`

  try {
    const client = createAnthropicClient()
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== "text") return fallbackInsights("Respuesta no textual del modelo")

    if (message.stop_reason === "max_tokens") {
      return fallbackInsights("La respuesta del modelo se truncó (max_tokens). Intenta de nuevo.")
    }

    let cleaned = content.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim()

    // Aislar el primer objeto JSON por si el modelo agrega texto extra
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1)
    }

    const parsed = JSON.parse(cleaned) as {
      summary: string
      forecastScore: number
      riskScore: number
      insights: AiInsight[]
    }

    return {
      summary:       parsed.summary,
      insights:      parsed.insights,
      forecastScore: parsed.forecastScore,
      riskScore:     parsed.riskScore,
      generatedAt:   new Date().toISOString(),
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    console.error("[ai-revenue-insights] error:", detail)
    return fallbackInsights(detail)
  }
}

function fallbackInsights(detail?: string): AiRevenueInsights {
  return {
    summary: detail
      ? `No se pudo generar el análisis automático. Detalle: ${detail}`
      : "No se pudo generar el análisis automático. Verifica la configuración de ANTHROPIC_API_KEY.",
    insights: [],
    forecastScore: 0,
    riskScore: 0,
    generatedAt: new Date().toISOString(),
  }
}
