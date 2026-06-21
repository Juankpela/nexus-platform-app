// Solo lectura: valida en PROD que PRIORIDAD 1 (Worker Mobile V2) se ejecuta.
//  (1) Redirect: roleKeys reales por usuario → ¿técnico-puro → /worker?
//  (2) Cabecera: corre el ASSIGNMENT_SELECT exacto del app (embed nuevo de
//      work_orders.priority + cases(sla_due_at, incident_type, service_issue_types))
//      para probar que el query no da error de ambigüedad y trae los datos.
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) throw new Error("Faltan envs")

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
async function q(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  const body = await res.text()
  if (!res.ok) throw new Error(`${path}\n  → ${res.status} ${body}`)
  return JSON.parse(body)
}

// Réplica EXACTA de la regla del app (modules/request-context/domain/role.ts).
const isTechnicianOnly = (keys) => keys.length > 0 && keys.every((k) => k === "technician")

// Réplica EXACTA del ASSIGNMENT_SELECT (supabase-execution-repository.ts).
const ASSIGNMENT_SELECT =
  "id,scheduled_start,scheduled_end,work_order_id," +
  "work_orders(work_order_number,subject,priority,companies(name),assets(name,asset_number)," +
  "cases(sla_due_at,incident_type,service_issue_types(name)))," +
  "work_order_executions(id,status,resolution_notes,unable_reason)"

// Mapa user_id → email (auth admin).
const usersRes = await fetch(`${BASE}/auth/v1/admin/users?per_page=500`, { headers: H })
const usersJson = await usersRes.json()
const emailOf = new Map((usersJson.users ?? []).map((u) => [u.id, u.email]))

for (const SLUG of ["oracle", "huella-global"]) {
  const [tenant] = await q(`tenants?slug=eq.${SLUG}&select=id,name`)
  if (!tenant) continue
  const t = tenant.id
  console.log(`\n================ ${tenant.name} (${SLUG}) ================`)

  // (1) REDIRECT — roleKeys por membresía activa
  console.log("\n  [1] REDIRECT (rol → landing):")
  const memberships = await q(
    `tenant_memberships?tenant_id=eq.${t}&status=eq.active&select=id,user_id`,
  )
  for (const m of memberships) {
    const roleRows = await q(`membership_roles?membership_id=eq.${m.id}&select=roles(key)`)
    const roleKeys = roleRows.map((r) => r.roles?.key).filter(Boolean)
    const landing = isTechnicianOnly(roleKeys) ? "/worker  ✅ técnico" : "/dashboard (back-office)"
    console.log(`      ${(emailOf.get(m.user_id) ?? m.user_id).padEnd(34)} [${roleKeys.join(", ")}] → ${landing}`)
  }

  // (2) CABECERA — corre el embed exacto para técnicos con login
  console.log("\n  [2] CABECERA (embed ASSIGNMENT_SELECT real):")
  const techs = await q(
    `technicians?tenant_id=eq.${t}&deleted_at=is.null&user_id=not.is.null&select=id,first_name,last_name`,
  )
  for (const tech of techs) {
    const rows = await q(
      `work_order_assignments?tenant_id=eq.${t}&technician_id=eq.${tech.id}&select=${ASSIGNMENT_SELECT}&limit=2`,
    )
    if (rows.length === 0) continue
    for (const r of rows) {
      const wo = r.work_orders
      const c = wo?.cases
      const tipo = c?.service_issue_types?.name ?? c?.incident_type ?? "—"
      const sla = c?.sla_due_at ?? "—"
      console.log(
        `      ${wo?.work_order_number ?? "?"} | ${tech.first_name} ${tech.last_name} | ` +
          `prioridad=${wo?.priority ?? "—"} | tipo=${tipo} | SLA=${sla}`,
      )
    }
  }
}
console.log("\n✅ El embed corrió sin error de ambigüedad. (fin)")
