import "server-only"

import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { SupabaseAuditRepository } from "@/modules/audit/infrastructure/supabase-audit-repository"
import type { UUID } from "@/types/shared"

/**
 * Factura automática "cliente exprés" (Opción A) — se dispara cuando el técnico
 * marca la orden como FACTURABLE al cerrar. Como los reportes públicos no traen
 * cliente, el vínculo solicitud↔cliente se crea AQUÍ, en el momento en que
 * aparece el dinero: se resuelve (o crea) un cliente mínimo con los datos del
 * reportante, se asocia a la WO y se genera la factura BORRADOR cargada a la WO.
 *
 * Corre con admin (acción de sistema tras el cierre del técnico, que carece de
 * permisos de facturación). Best-effort: idempotente y tolerante a fallos — un
 * error aquí no revierte el cierre del trabajo.
 *
 * El monto queda en 0: el borrador lo deja listo y el coordinador fija el precio
 * (mismo criterio que la generación de factura desde caso ya existente).
 */
export async function generateExpressInvoiceFromWorkOrder(input: {
  tenantId: UUID
  workOrderId: UUID
  actorUserId: UUID
  requestId: UUID
}): Promise<{ invoiceId: UUID; companyId: UUID } | null> {
  const admin = createAdminSupabaseClient()

  // 1) WO: debe estar completada para facturar.
  const { data: wo } = await admin
    .from("work_orders")
    .select("id, company_id, case_id, status")
    .eq("tenant_id", input.tenantId)
    .eq("id", input.workOrderId)
    .maybeSingle()
  const woRow = wo as
    | { id: string; company_id: string | null; case_id: string | null; status: string }
    | null
  if (!woRow || woRow.status !== "completed") return null

  // 2) Dedup: si la WO ya tiene una factura activa (no anulada), no crear otra.
  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("work_order_id", input.workOrderId)
    .neq("status", "void")
    .limit(1)
    .maybeSingle()
  if (existing) return null

  // 3) Cliente: el de la WO si existe; si no, "cliente exprés" desde el reportante.
  let companyId = woRow.company_id
  if (!companyId) {
    let reporterName: string | null = null
    let reporterPhone: string | null = null
    let subject: string | null = null
    if (woRow.case_id) {
      const { data: c } = await admin
        .from("cases")
        .select("reporter_name, reporter_phone, subject")
        .eq("id", woRow.case_id)
        .maybeSingle()
      const cRow = c as
        | { reporter_name: string | null; reporter_phone: string | null; subject: string | null }
        | null
      reporterName = cRow?.reporter_name ?? null
      reporterPhone = cRow?.reporter_phone ?? null
      subject = cRow?.subject ?? null
    }

    // Reusar un cliente con el mismo teléfono (evita duplicados por reportante).
    if (reporterPhone) {
      const { data: found } = await admin
        .from("companies")
        .select("id")
        .eq("tenant_id", input.tenantId)
        .eq("phone", reporterPhone)
        .limit(1)
        .maybeSingle()
      if (found) companyId = (found as { id: string }).id
    }

    if (!companyId) {
      const name =
        reporterName?.trim() ||
        (reporterPhone ? `Cliente ${reporterPhone}` : subject?.trim() || "Cliente sin nombre")
      const { data: created, error: cErr } = await admin
        .from("companies")
        .insert({
          tenant_id: input.tenantId,
          name: name.slice(0, 200),
          phone: reporterPhone,
        } as never)
        .select("id")
        .single()
      if (cErr || !created) return null
      companyId = (created as { id: string }).id
    }

    // Asociar el cliente a la WO (crea el vínculo solicitud↔cliente).
    await admin
      .from("work_orders")
      .update({ company_id: companyId } as never)
      .eq("tenant_id", input.tenantId)
      .eq("id", input.workOrderId)
  }

  // 4) Factura BORRADOR cargada a la WO (sin número fiscal hasta emitir; monto 0).
  const { data: inv, error: iErr } = await admin
    .from("invoices")
    .insert({
      tenant_id: input.tenantId,
      origin_type: "work_order",
      work_order_id: input.workOrderId,
      company_id: companyId,
      status: "draft",
      currency: "COP",
      subtotal: 0,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      amount_paid: 0,
    } as never)
    .select("id")
    .single()
  if (iErr || !inv) return null
  const invoiceId = (inv as { id: string }).id

  // Traza de negocio (evento de sistema).
  try {
    await new SupabaseAuditRepository(() => admin).append({
      eventType: "invoice.created",
      actorType: "system",
      actorId: input.actorUserId,
      tenantId: input.tenantId,
      subjectType: "invoice",
      subjectId: invoiceId,
      action: "invoice.created",
      metadata: { originType: "work_order", workOrderId: input.workOrderId, express: true },
      requestId: input.requestId,
      source: "field",
    })
  } catch {
    // La traza es best-effort; la factura ya quedó creada.
  }

  return { invoiceId, companyId: companyId as UUID }
}
