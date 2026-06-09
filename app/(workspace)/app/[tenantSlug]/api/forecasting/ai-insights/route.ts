import { NextResponse, type NextRequest } from "next/server"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { requirePermission } from "@/modules/authorization/application/require-permission"
import { FORECASTING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getTenantAiInsights } from "@/modules/forecasting/composition"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug } = await params
    const context = await getRequestContext(tenantSlug)
    requirePermission(context.effectivePermissions, FORECASTING_PERMISSIONS.read)

    const insights = await getTenantAiInsights(context.tenantId)
    return NextResponse.json(insights)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido generando insights"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
