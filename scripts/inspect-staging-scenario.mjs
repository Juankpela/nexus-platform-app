// Solo lectura: inspecciona el escenario de validación en STAGING (tenant
// staging-test): técnicos con login, sus asignaciones + estado de ejecución, el
// caso (teléfono + ubicación) y un admin. Sirve para preparar la prueba E2E de
// A/B/C. NO modifica datos (salvo que se llame reset-staging-scenario.mjs).
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

const SLUG = process.argv[2] ?? "staging-test"
const [tenant] = await q(`tenants?slug=eq.${SLUG}&select=id,name,slug`)
if (!tenant) throw new Error(`No existe tenant ${SLUG}`)
const t = tenant.id
console.log(`TENANT ${tenant.name} (${SLUG}) ${t}`)

// admins / miembros
const usersRes = await fetch(`${BASE}/auth/v1/admin/users?per_page=500`, { headers: H })
const emailOf = new Map(((await usersRes.json()).users ?? []).map((u) => [u.id, u.email]))
const memberships = await q(`tenant_memberships?tenant_id=eq.${t}&status=eq.active&select=id,user_id`)
console.log("\nMIEMBROS:")
for (const m of memberships) {
  const roleRows = await q(`membership_roles?membership_id=eq.${m.id}&select=roles(key)`)
  const keys = roleRows.map((r) => r.roles?.key).filter(Boolean)
  console.log(`  ${(emailOf.get(m.user_id) ?? m.user_id).padEnd(34)} [${keys.join(", ")}]`)
}

// técnicos + asignaciones + ejecución
const techs = await q(
  `technicians?tenant_id=eq.${t}&deleted_at=is.null&select=id,first_name,last_name,user_id`,
)
console.log("\nTÉCNICOS + ASIGNACIONES:")
for (const tech of techs) {
  const email = tech.user_id ? emailOf.get(tech.user_id) : null
  const rows = await q(
    `work_order_assignments?tenant_id=eq.${t}&technician_id=eq.${tech.id}` +
      `&select=id,work_order_id,work_orders(work_order_number,status,case_id,cases(case_number,reporter_phone,service_lat,service_lng))` +
      `,work_order_executions(id,status,accepted_at,arrived_at,started_at,completed_at)&limit=5`,
  )
  console.log(`\n  ${tech.first_name} ${tech.last_name} <${email ?? "sin login"}> tech=${tech.id}`)
  for (const r of rows) {
    const wo = r.work_orders
    const c = wo?.cases
    const ex = r.work_order_executions?.[0]
    console.log(
      `    asg=${r.id} | ${wo?.work_order_number} (${wo?.status}) | exec=${ex?.status ?? "—"} ` +
        `| tel=${c?.reporter_phone ?? "—"} | geo=${c?.service_lat ?? "—"},${c?.service_lng ?? "—"} | case=${c?.case_number}`,
    )
  }
}
console.log("\n(fin inspección)")
