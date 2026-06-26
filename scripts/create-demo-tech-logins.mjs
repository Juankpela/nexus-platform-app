// Logins para los técnicos del tenant demo en PROD: crea usuario auth (password
// 12345678), normaliza el correo (sin tildes, válido para login), lo vincula a
// technicians.user_id, crea membresía + rol "technician" (entra a /worker).
// Idempotente. Lee .env.prod (creds de PROD). Uso: node scripts/create-demo-tech-logins.mjs
import { readFileSync } from "node:fs"

const SLUG = "demo-hvac"
const PASSWORD = "12345678"

let env
try {
  env = Object.fromEntries(readFileSync(".env.prod", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")] }))
} catch { console.error("✗ Falta nexus-platform/.env.prod (creds de PROD)."); process.exit(1) }
const BASE = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) { console.error("✗ .env.prod incompleto"); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
const get = (p) => fetch(`${BASE}/rest/v1/${p}`, { headers: H }).then((r) => r.json())
async function upsert(table, row, onConflict) {
  const r = await fetch(`${BASE}/rest/v1/${table}?on_conflict=${onConflict}&select=*`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) })
  if (!r.ok) throw new Error(`upsert ${table} ${r.status} ${await r.text()}`); const d = await r.json(); return Array.isArray(d) ? d[0] : d
}
async function patch(p, body) { const r = await fetch(`${BASE}/rest/v1/${p}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`patch ${p} ${r.status} ${await r.text()}`); return r.json() }
async function findAuthUser(email) { let page = 1; for (;;) { const r = await fetch(`${BASE}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H }); const data = await r.json(); const users = data.users ?? []; const m = users.find((u) => u.email?.toLowerCase() === email.toLowerCase()); if (m) return m; if (users.length < 200) return null; page += 1 } }
async function createAuthUser(email) {
  const r = await fetch(`${BASE}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }) })
  if (r.ok) return r.json()
  const existing = await findAuthUser(email)
  if (!existing) throw new Error(`create user ${email} ${r.status} ${await r.text()}`)
  await fetch(`${BASE}/auth/v1/admin/users/${existing.id}`, { method: "PUT", headers: H, body: JSON.stringify({ password: PASSWORD, email_confirm: true }) })
  return existing
}

const tenant = (await get(`tenants?slug=eq.${SLUG}&select=id`))[0]
if (!tenant) throw new Error(`Tenant "${SLUG}" no existe (corre seed-prod-demo.mjs primero).`)
const role = (await get(`roles?key=eq.technician&select=id`))[0]
if (!role) throw new Error('No existe el rol "technician".')
const techs = await get(`technicians?tenant_id=eq.${tenant.id}&deleted_at=is.null&select=id,first_name,last_name,email`)

console.log(`Creando logins para ${techs.length} técnicos de "${SLUG}"…\n`)
for (const t of techs) {
  const email = stripAccents(t.email).toLowerCase()
  const user = await createAuthUser(email)
  await patch(`technicians?id=eq.${t.id}&tenant_id=eq.${tenant.id}`, { user_id: user.id, email })
  const m = await upsert("tenant_memberships", { tenant_id: tenant.id, user_id: user.id, status: "active" }, "tenant_id,user_id")
  await upsert("membership_roles", { membership_id: m.id, tenant_id: tenant.id, role_id: role.id }, "membership_id,role_id")
  console.log(`✓ ${t.first_name} ${t.last_name}  —  ${email}  /  ${PASSWORD}`)
}
console.log(`\n✓ Listo. Login en /login → entra a /worker (móvil de técnico). Tenant ${SLUG}.`)
