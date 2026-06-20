// Crea logins para los técnicos de "oracle": usuario de auth (password 12345678),
// lo vincula al técnico (technicians.user_id), crea su membresía en el tenant y le
// asigna el rol "technician" (service.field.read/execute). Idempotente.
//
// Uso: node scripts/create-oracle-tech-logins.mjs [slug]   (default oracle)
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
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const slug = (process.argv[2] ?? "oracle").toLowerCase()
const PASSWORD = "12345678"

const get = (p) => fetch(`${BASE}/rest/v1/${p}`, { headers: H }).then((r) => r.json())
async function upsert(table, row, onConflict) {
  const r = await fetch(`${BASE}/rest/v1/${table}?on_conflict=${onConflict}&select=*`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  })
  if (!r.ok) throw new Error(`upsert ${table} ${r.status} ${await r.text()}`)
  const d = await r.json()
  return Array.isArray(d) ? d[0] : d
}
async function patch(p, body) {
  const r = await fetch(`${BASE}/rest/v1/${p}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`patch ${p} ${r.status} ${await r.text()}`)
  return r.json()
}

async function findAuthUser(email) {
  let page = 1
  for (;;) {
    const r = await fetch(`${BASE}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H })
    const data = await r.json()
    const users = data.users ?? []
    const m = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (m) return m
    if (users.length < 200) return null
    page += 1
  }
}
async function createAuthUser(email) {
  const r = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  })
  if (r.ok) return r.json()
  // Ya existe → buscarlo y (re)establecer su contraseña.
  const existing = await findAuthUser(email)
  if (!existing) throw new Error(`create user ${email} ${r.status} ${await r.text()}`)
  await fetch(`${BASE}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  })
  return existing
}

async function main() {
  const tenant = (await get(`tenants?slug=eq.${slug}&select=id`))[0]
  if (!tenant) throw new Error(`Tenant "${slug}" no existe.`)
  const tenantId = tenant.id
  const role = (await get(`roles?key=eq.technician&select=id`))[0]
  if (!role) throw new Error('No existe el rol "technician".')

  const techs = await get(
    `technicians?tenant_id=eq.${tenantId}&deleted_at=is.null&select=id,first_name,last_name,email`,
  )
  if (!techs.length) {
    console.error(`No hay técnicos en "${slug}". Corre seed-oracle.mjs primero.`)
    process.exit(1)
  }

  console.log(`Creando logins para ${techs.length} técnicos de "${slug}"…\n`)
  for (const t of techs) {
    const user = await createAuthUser(t.email)
    await patch(`technicians?id=eq.${t.id}&tenant_id=eq.${tenantId}`, { user_id: user.id })
    const membership = await upsert(
      "tenant_memberships",
      { tenant_id: tenantId, user_id: user.id, status: "active" },
      "tenant_id,user_id",
    )
    await upsert(
      "membership_roles",
      { membership_id: membership.id, tenant_id: tenantId, role_id: role.id },
      "membership_id,role_id",
    )
    console.log(`✓ ${t.first_name} ${t.last_name}  —  ${t.email}  /  ${PASSWORD}`)
  }

  console.log(`\n✓ Listo. Inicia sesión en /login y entra a /select-tenant → ${slug} → /worker`)
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message ?? e)
  process.exit(1)
})
