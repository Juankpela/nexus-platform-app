import { renderToBuffer } from "@react-pdf/renderer"

import { buildQuotePdf } from "@/components/crm/quote-pdf-document"
import { hasPermission, CRM_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getQuoteRecord, listQuoteLines } from "@/modules/crm/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { getTenantBusinessProfile } from "@/modules/tenancy/composition"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string; quoteId: string }> },
) {
  const { tenantSlug, quoteId } = await params
  const context = await getRequestContext(tenantSlug)
  if (!hasPermission(context.effectivePermissions, CRM_PERMISSIONS.quotesRead)) {
    return new Response("Forbidden", { status: 403 })
  }

  const [quote, lines, issuer] = await Promise.all([
    getQuoteRecord(context.tenantId, quoteId),
    listQuoteLines(context.tenantId, quoteId),
    getTenantBusinessProfile(context.tenantId),
  ])
  if (!quote) return new Response("Not found", { status: 404 })

  const buffer = await renderToBuffer(
    buildQuotePdf({ quote, lines, tenantName: context.tenant.name, issuer }),
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
