// Bootstrap del primer super_admin de la plataforma.
//
// El RPC grant_platform_admin requiere YA ser super_admin, así que el primero
// debe sembrarse fuera de banda. Este script usa el service role key (omite RLS)
// para insertar la fila en platform_user_roles.
//
// Uso:
//   node scripts/grant-platform-admin.mjs <email>

import { readFileSync } from "node:fs"

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

const email = process.argv[2]?.toLowerCase()
if (!email) {
  console.error("Uso: node scripts/grant-platform-admin.mjs <email>")
  process.exit(1)
}

const baseHeaders = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
}

async function req(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...baseHeaders, ...options.headers } })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${text}`)
  return body
}

async function findUserByEmail(targetEmail) {
  let page = 1
  for (;;) {
    const data = await req(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`)
    const users = data.users ?? []
    const match = users.find((u) => u.email?.toLowerCase() === targetEmail)
    if (match) return match
    if (users.length < 200) return null
    page += 1
  }
}

async function main() {
  console.log(`Buscando usuario ${email}...`)
  const user = await findUserByEmail(email)
  if (!user) {
    console.error(
      `No encontré un usuario con email ${email} en Supabase Auth.\n` +
        `Regístrate/inicia sesión una vez en /login para crearlo y vuelve a correr el script.`,
    )
    process.exit(1)
  }
  console.log(`  usuario: ${user.id}`)

  const roles = await req(
    `${SUPABASE_URL}/rest/v1/platform_roles?key=eq.super_admin&select=id`,
  )
  if (!roles.length) throw new Error("No existe el rol super_admin (¿corriste las migraciones?)")
  const roleId = roles[0].id

  await req(
    `${SUPABASE_URL}/rest/v1/platform_user_roles?on_conflict=user_id,role_id&select=user_id`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ user_id: user.id, role_id: roleId }),
    },
  )

  console.log(`\n✓ ${email} ahora es super_admin. Inicia sesión y entra a /platform`)
}

main().catch((error) => {
  console.error("\n✗ Error:", error.message ?? error)
  process.exit(1)
})
