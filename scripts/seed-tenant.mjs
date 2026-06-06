// Seed de datos de prueba: crea un tenant, una membresía activa para un usuario
// existente y le asigna el rol tenant_admin. Usa el service role key (omite RLS).
//
// Implementado con fetch directo a la API REST de Supabase para evitar la
// dependencia de WebSocket de supabase-js en Node < 22.
//
// Uso:
//   node scripts/seed-tenant.mjs <email> [tenantSlug] [tenantName]

import { readFileSync } from "node:fs"

// --- Cargar .env.local manualmente ---
function loadEnv(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  } catch (error) {
    console.error(`No pude leer ${path}:`, error.message)
    process.exit(1)
  }
  return env
}

const env = loadEnv(".env.local")
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const [, , emailArg, slugArg, nameArg] = process.argv
if (!emailArg) {
  console.error("Uso: node scripts/seed-tenant.mjs <email> [tenantSlug] [tenantName]")
  process.exit(1)
}

const email = emailArg.toLowerCase()
const tenantSlug = slugArg ?? "acme"
const tenantName = nameArg ?? "Acme Inc"

const baseHeaders = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
}

async function req(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...baseHeaders, ...options.headers } })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  return body
}

// --- 1. Buscar usuario de auth por email (paginando) ---
async function findUserByEmail(targetEmail) {
  let page = 1
  for (;;) {
    const data = await req(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
    )
    const users = data.users ?? []
    const match = users.find((u) => u.email?.toLowerCase() === targetEmail)
    if (match) return match
    if (users.length < 200) return null
    page += 1
  }
}

// --- Upsert genérico vía PostgREST ---
async function upsert(table, row, onConflict, returnCols = "*") {
  const data = await req(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}&select=${returnCols}`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    },
  )
  return Array.isArray(data) ? data[0] : data
}

async function main() {
  console.log(`Buscando usuario ${email}...`)
  const user = await findUserByEmail(email)
  if (!user) {
    console.error(
      `No encontré un usuario con email ${email} en Supabase Auth.\n` +
        `Regístrate/inicia sesión una vez en /login para crearlo y vuelve a correr el seed.`,
    )
    process.exit(1)
  }
  console.log(`  usuario: ${user.id}`)

  const tenant = await upsert(
    "tenants",
    { slug: tenantSlug, name: tenantName, status: "active" },
    "slug",
    "id,slug,name",
  )
  console.log(`  tenant: ${tenant.id} (${tenant.slug})`)

  const membership = await upsert(
    "tenant_memberships",
    { tenant_id: tenant.id, user_id: user.id, status: "active" },
    "tenant_id,user_id",
    "id",
  )
  console.log(`  membresía: ${membership.id} (active)`)

  const roles = await req(
    `${SUPABASE_URL}/rest/v1/roles?key=eq.tenant_admin&select=id`,
  )
  if (!roles.length) throw new Error("No existe el rol tenant_admin (¿corriste la migración?)")
  const roleId = roles[0].id

  await upsert(
    "membership_roles",
    { membership_id: membership.id, tenant_id: tenant.id, role_id: roleId },
    "membership_id,role_id",
    "membership_id",
  )
  console.log(`  rol: tenant_admin asignado`)

  console.log(`\n✓ Listo. Inicia sesión con ${email} y entra a /select-tenant`)
}

main().catch((error) => {
  console.error("\n✗ Error en el seed:", error.message ?? error)
  process.exit(1)
})
