// P0-2 — Verificación de integridad contra DB real: el candado único parcial
// DEBE rechazar una segunda factura activa para el mismo work_order.
// Toma una factura activa existente con work_order_id, intenta duplicarla y
// espera SQLSTATE 23505. La inserción falla → no persiste nada (no ensucia datos).
import { readFileSync } from "node:fs"

const argIdx = process.argv.indexOf("--env")
const envFile = argIdx !== -1 ? process.argv[argIdx + 1] : ".env.local"
const raw = readFileSync(envFile, "utf8")
const read = (k) => {
  const m = raw.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, "m"))
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : ""
}
const url = read("NEXT_PUBLIC_SUPABASE_URL")
const key = read("SUPABASE_SERVICE_ROLE_KEY")
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }

// 1) Buscar una factura activa con work_order_id.
const r = await fetch(
  `${url}/rest/v1/invoices?status=neq.void&work_order_id=not.is.null&select=tenant_id,work_order_id,company_id&limit=1`,
  { headers: H },
)
const rows = await r.json()
if (!rows.length) {
  console.log("⚠ No hay factura activa con work_order_id en este entorno; no se puede probar el duplicado de WO aquí.")
  process.exit(0)
}
const { tenant_id, work_order_id, company_id } = rows[0]
console.log(`Probando duplicado para WO ${work_order_id} (tenant ${tenant_id})`)

// 2) Intentar insertar una SEGUNDA factura activa para el mismo WO.
const ins = await fetch(`${url}/rest/v1/invoices`, {
  method: "POST",
  headers: { ...H, Prefer: "return=representation" },
  body: JSON.stringify({
    tenant_id,
    origin_type: "work_order",
    work_order_id,
    company_id,
    status: "draft",
    currency: "COP",
  }),
})

if (ins.status === 201) {
  // No debería pasar: limpiamos el insert espurio y fallamos la verificación.
  const created = await ins.json()
  await fetch(`${url}/rest/v1/invoices?id=eq.${created[0].id}`, { method: "DELETE", headers: H })
  console.error("⛔ FALLO: se permitió una segunda factura para el mismo WO (candado NO activo). Se limpió el insert.")
  process.exit(1)
}

const body = await ins.text()
if (body.includes("23505") || ins.status === 409) {
  console.log(`✓ Rechazado correctamente (HTTP ${ins.status}, 23505). El candado anti-doble-factura funciona.`)
  process.exit(0)
}
console.error(`⛔ Error inesperado (HTTP ${ins.status}): ${body}`)
process.exit(1)
