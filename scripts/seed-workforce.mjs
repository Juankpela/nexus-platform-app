// Seed de datos de DEMO para el módulo Workforce (PR3).
//
// Crea un catálogo de skills en el tenant y se las asigna a sus técnicos, para
// poder hacer la demo del módulo de capacidades. Idempotente (upsert por nombre
// y por (tenant, técnico, skill)). Usa el service role key (omite RLS).
//
// REQUISITO: primero aplica las migraciones (npm run db:push) — las tablas
// skills / technician_skills deben existir.
//
// Uso:
//   node scripts/seed-workforce.mjs <tenantSlug>
//   node scripts/seed-workforce.mjs huella-global
//
// Cubre PR3A (skills) y PR3C (zones). PR3B (availability) se añadirá cuando exista.

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

const tenantSlug = process.argv[2] ?? "huella-global"

// Catálogo de demo + niveles por defecto para repartir entre técnicos.
const SKILL_CATALOG = [
  "Refrigeración",
  "Electricidad",
  "Plomería",
  "Redes y cableado",
  "HVAC",
  "Mecánica general",
]
const LEVELS = ["junior", "mid", "senior", "expert"]
const ZONE_CATALOG = [
  "Medellín Norte",
  "Medellín Sur",
  "Medellín Centro",
  "Envigado",
  "Bello",
  "Itagüí",
]

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
  console.log(`Tenant: ${tenantSlug}`)
  const tenants = await req(
    `${SUPABASE_URL}/rest/v1/tenants?slug=eq.${tenantSlug}&select=id`,
  )
  if (!tenants.length) throw new Error(`No existe el tenant ${tenantSlug}`)
  const tenantId = tenants[0].id
  console.log(`  tenant_id: ${tenantId}`)

  // 1. Catálogo de skills (upsert por (tenant_id, name) activo).
  const skillIds = {}
  for (const name of SKILL_CATALOG) {
    const existing = await req(
      `${SUPABASE_URL}/rest/v1/skills?tenant_id=eq.${tenantId}&name=eq.${encodeURIComponent(name)}&archived_at=is.null&select=id`,
    )
    if (existing.length) {
      skillIds[name] = existing[0].id
    } else {
      const created = await upsert("skills", { tenant_id: tenantId, name }, "id", "id")
      skillIds[name] = created.id
    }
  }
  console.log(`  skills en catálogo: ${Object.keys(skillIds).length}`)

  // 2. Técnicos del tenant (no borrados).
  const technicians = await req(
    `${SUPABASE_URL}/rest/v1/technicians?tenant_id=eq.${tenantId}&deleted_at=is.null&select=id,first_name,last_name`,
  )
  if (!technicians.length) {
    console.warn("  ⚠ No hay técnicos en este tenant — crea técnicos primero.")
    return
  }

  // 3. Asignar 2–3 skills rotando el catálogo, con nivel variado. Idempotente (upsert).
  const names = Object.keys(skillIds)
  let assignments = 0
  for (let t = 0; t < technicians.length; t++) {
    const tech = technicians[t]
    const count = 2 + (t % 2) // 2 ó 3 skills
    for (let k = 0; k < count; k++) {
      const name = names[(t + k) % names.length]
      const level = LEVELS[(t + k) % LEVELS.length]
      await upsert(
        "technician_skills",
        { tenant_id: tenantId, technician_id: tech.id, skill_id: skillIds[name], level },
        "tenant_id,technician_id,skill_id",
        "technician_id",
      )
      assignments++
    }
    console.log(`  ${tech.first_name} ${tech.last_name}: ${count} skills`)
  }

  // 4. Catálogo de zonas (upsert por (tenant_id, name) activo).
  const zoneIds = {}
  for (const name of ZONE_CATALOG) {
    const existing = await req(
      `${SUPABASE_URL}/rest/v1/service_zones?tenant_id=eq.${tenantId}&name=eq.${encodeURIComponent(name)}&archived_at=is.null&select=id`,
    )
    if (existing.length) {
      zoneIds[name] = existing[0].id
    } else {
      const created = await upsert("service_zones", { tenant_id: tenantId, name }, "id", "id")
      zoneIds[name] = created.id
    }
  }
  console.log(`  zonas en catálogo: ${Object.keys(zoneIds).length}`)

  // 5. Asignar 1–2 zonas por técnico, rotando (idempotente).
  const zoneNames = Object.keys(zoneIds)
  let zoneAssignments = 0
  for (let t = 0; t < technicians.length; t++) {
    const tech = technicians[t]
    const count = 1 + (t % 2) // 1 ó 2 zonas
    for (let k = 0; k < count; k++) {
      const name = zoneNames[(t + k) % zoneNames.length]
      await upsert(
        "technician_zones",
        { tenant_id: tenantId, technician_id: tech.id, zone_id: zoneIds[name] },
        "tenant_id,technician_id,zone_id",
        "technician_id",
      )
      zoneAssignments++
    }
  }
  console.log(`  zonas asignadas: ${zoneAssignments}`)

  console.log(
    `\n✓ Listo. ${assignments} skills y ${zoneAssignments} zonas en ${technicians.length} técnicos.`,
  )
}

main().catch((error) => {
  console.error("\n✗ Error en el seed:", error.message ?? error)
  process.exit(1)
})
