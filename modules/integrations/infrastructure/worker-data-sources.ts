import "server-only"

import { ApplicationError } from "@/lib/errors/application-error"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { ExportFetch } from "@/modules/integrations/application/ports/export-source"

/**
 * Worker data sources (ADR-024 worker exception): service-role reads, ALWAYS filtered
 * by the job's tenant_id. The shapes returned match exactly the fields the centralized
 * Column Registry accessors read — no other columns are projected.
 */

function fail(scope: string, error: unknown): never {
  throw new ApplicationError(`Worker read failed: ${scope}.`, "EXPORT_WORKER_READ_FAILED", error)
}

export const materialsWorkerFetch: ExportFetch = async (tenantId, filters, cap) => {
  const admin = createAdminSupabaseClient()
  let q = admin
    .from("materials")
    .select("sku,name,unit_of_measure,active,created_at", { count: "exact" })
    .eq("tenant_id", tenantId)
  if (filters.search) q = q.ilike("name", `%${filters.search}%`)
  if (filters.sku) q = q.ilike("sku", `%${filters.sku}%`)
  if (filters.active === "true") q = q.eq("active", true)
  if (filters.active === "false") q = q.eq("active", false)
  const { data, error, count } = await q.order("name").range(0, cap - 1)
  if (error) fail("materials", error)
  const rows = (data ?? []).map((r) => ({
    sku: r.sku,
    name: r.name,
    unitOfMeasure: r.unit_of_measure,
    active: r.active,
    createdAt: r.created_at,
  }))
  return { rows, total: count ?? rows.length }
}

export const accountsWorkerFetch: ExportFetch = async (tenantId, filters, cap) => {
  const admin = createAdminSupabaseClient()
  let q = admin
    .from("companies")
    .select("name,tax_id,industry,phone,city,country,status,created_at", { count: "exact" })
    .eq("tenant_id", tenantId)
  if (filters.search) q = q.ilike("name", `%${filters.search}%`)
  const { data, error, count } = await q.order("name").range(0, cap - 1)
  if (error) fail("accounts", error)
  const rows = (data ?? []).map((r) => ({
    name: r.name,
    taxId: r.tax_id,
    industry: r.industry,
    phone: r.phone,
    city: r.city,
    country: r.country,
    status: r.status,
    createdAt: r.created_at,
  }))
  return { rows, total: count ?? rows.length }
}

export const contactsWorkerFetch: ExportFetch = async (tenantId, filters, cap) => {
  const admin = createAdminSupabaseClient()
  let q = admin
    .from("contacts")
    .select(
      "first_name,last_name,email,phone,mobile,title,status,created_at,companies(name)",
      { count: "exact" },
    )
    .eq("tenant_id", tenantId)
  if (filters.search) q = q.ilike("first_name", `%${filters.search}%`)
  const { data, error, count } = await q.order("first_name").range(0, cap - 1)
  if (error) fail("contacts", error)
  const rows = (
    (data ?? []) as unknown as Array<{
      first_name: string
      last_name: string | null
      email: string | null
      phone: string | null
      mobile: string | null
      title: string | null
      status: string
      created_at: string
      companies: { name: string } | null
    }>
  ).map((r) => ({
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    mobile: r.mobile,
    title: r.title,
    companyName: r.companies?.name ?? null,
    status: r.status,
    createdAt: r.created_at,
  }))
  return { rows, total: count ?? rows.length }
}
