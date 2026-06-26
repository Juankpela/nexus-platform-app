// STAGING únicamente: asegura un admin (admin@staging.test) en el tenant
// staging-test para validar el Centro Operacional. Crea el usuario auth (si falta),
// la membresía activa y le asigna el rol tenant_admin. Idempotente. NO toca prod
// (el guard de .env.local + el ref staging lo garantizan).
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
const REF = BASE.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)[1]
if (REF !== "oyjvnzjdgbzwojmjjlyn") throw new Error(`ABORT: ref ${REF} no es staging`)
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

async function rest(path, init = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } })
  const body = await res.text()
  if (!res.ok) throw new Error(`${path} → ${res.status} ${body}`)
  return body ? JSON.parse(body) : null
}

const EMAIL = "admin@staging.test"
const PASSWORD = "Staging1234!"
const TENANT_ADMIN_ROLE = "13a1131a-266d-4d47-a8cc-54cc5feadafe"

const [tenant] = await rest(`tenants?slug=eq.staging-test&select=id`)
const TENANT = tenant.id

// 1) Usuario auth (idempotente)
const list = await (await fetch(`${BASE}/auth/v1/admin/users?per_page=500`, { headers: H })).json()
let user = (list.users ?? []).find((u) => u.email === EMAIL)
if (!user) {
  const res = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  })
  if (!res.ok) throw new Error(`crear user → ${res.status} ${await res.text()}`)
  user = await res.json()
  console.log(`✓ usuario creado ${EMAIL}`)
} else {
  console.log(`= usuario ya existe ${EMAIL}`)
}

// 2) Membresía activa (idempotente)
let [membership] = await rest(
  `tenant_memberships?tenant_id=eq.${TENANT}&user_id=eq.${user.id}&select=id,status`,
)
if (!membership) {
  ;[membership] = await rest(`tenant_memberships`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ tenant_id: TENANT, user_id: user.id, status: "active" }),
  })
  console.log(`✓ membresía creada ${membership.id}`)
} else {
  console.log(`= membresía ya existe ${membership.id} (${membership.status})`)
}

// 3) Rol tenant_admin (idempotente)
const existingRole = await rest(
  `membership_roles?membership_id=eq.${membership.id}&role_id=eq.${TENANT_ADMIN_ROLE}&select=membership_id`,
)
if (existingRole.length === 0) {
  await rest(`membership_roles`, {
    method: "POST",
    body: JSON.stringify({
      membership_id: membership.id,
      role_id: TENANT_ADMIN_ROLE,
      tenant_id: TENANT,
    }),
  })
  console.log(`✓ rol tenant_admin asignado`)
} else {
  console.log(`= rol tenant_admin ya asignado`)
}

console.log(`\nLISTO. admin=${EMAIL} pass=${PASSWORD} tenant=staging-test`)
