import { renderToBuffer } from "@react-pdf/renderer"

import { buildInvoicePdf } from "@/components/billing/invoice-pdf-document"
import { hasPermission, BILLING_PERMISSIONS } from "@/modules/authorization/domain/permission"
import { getInvoiceRecord, listInvoiceLines } from "@/modules/billing/composition"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { getTenantBusinessProfile } from "@/modules/tenancy/composition"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantSlug: string; invoiceId: string }> },
) {
  const { tenantSlug, invoiceId } = await params
  const context = await getRequestContext(tenantSlug)
  if (!hasPermission(context.effectivePermissions, BILLING_PERMISSIONS.invoicesRead)) {
    return new Response("Forbidden", { status: 403 })
  }

  const [invoice, lines, issuer] = await Promise.all([
    getInvoiceRecord(context.tenantId, invoiceId),
    listInvoiceLines(context.tenantId, invoiceId),
    getTenantBusinessProfile(context.tenantId),
  ])
  if (!invoice) return new Response("Not found", { status: 404 })

  const buffer = await renderToBuffer(
    buildInvoicePdf({ invoice, lines, tenantName: context.tenant.name, issuer }),
  )

  const fileName = (invoice.invoiceNumber ?? "factura").replace(/[^\w.-]/g, "_")
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
