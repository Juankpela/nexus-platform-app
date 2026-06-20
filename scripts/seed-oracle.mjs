// Seed de la organización "oracle" — empresa de telecomunicaciones (Televisión,
// Telefonía, Internet). Crea skills + tipos de daño (service_issue_types) + 6
// técnicos (2 por servicio, con niveles distintos) + disponibilidad para que el
// motor pueda coordinar. Idempotente: re-ejecutar no duplica (busca por nombre).
//
// Uso: node scripts/seed-oracle.mjs [slug]   (default: oracle)
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

async function get(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path} ${r.status} ${await r.text()}`)
  return r.json()
}
async function post(path, body) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`POST ${path} ${r.status} ${await r.text()}`)
  return r.json()
}

// Catálogo operacional de telecomunicaciones.
const CATALOG = {
  "Televisión": [
    "Sin señal",
    "Canales faltantes",
    "Imagen pixelada o congelada",
    "Control remoto no funciona",
    "Decodificador no enciende",
    "Instalación nueva",
  ],
  "Telefonía": [
    "Sin tono",
    "Llamadas se cortan",
    "No puedo realizar llamadas",
    "Ruido en la línea",
    "Instalación nueva",
  ],
  "Internet": [
    "Sin internet",
    "Internet lento",
    "WiFi intermitente",
    "Router no enciende",
    "No conecta por cable",
    "Instalación nueva",
  ],
}

// 6 técnicos: 2 por servicio, con NIVELES distintos (el motor desempata por nivel).
const TECHNICIANS = [
  { first: "Carlos", last: "Restrepo", email: "carlos.restrepo@oracle.test", skill: "Televisión", level: "expert" },
  { first: "Andrés", last: "Gómez", email: "andres.gomez@oracle.test", skill: "Televisión", level: "mid" },
  { first: "Mauricio", last: "Díaz", email: "mauricio.diaz@oracle.test", skill: "Telefonía", level: "senior" },
  { first: "Felipe", last: "Romero", email: "felipe.romero@oracle.test", skill: "Telefonía", level: "junior" },
  { first: "Laura", last: "Jiménez", email: "laura.jimenez@oracle.test", skill: "Internet", level: "expert" },
  { first: "Diego", last: "Torres", email: "diego.torres@oracle.test", skill: "Internet", level: "mid" },
]

const WORK_DAYS = [1, 2, 3, 4, 5] // Lun–Vie
const DAY_START = 8 * 60 // 08:00
const DAY_END = 17 * 60 // 17:00

async function main() {
  const tenants = await get(`tenants?slug=eq.${slug}&select=id,name`)
  if (!tenants.length) {
    console.error(`Tenant "${slug}" no existe. Crea la organización primero.`)
    process.exit(1)
  }
  const tenantId = tenants[0].id
  console.log(`Sembrando "${tenants[0].name}" (${slug})…\n`)

  // 1) Skills
  const skillIds = {}
  for (const name of Object.keys(CATALOG)) {
    const existing = await get(
      `skills?tenant_id=eq.${tenantId}&name=eq.${encodeURIComponent(name)}&archived_at=is.null&select=id`,
    )
    if (existing.length) {
      skillIds[name] = existing[0].id
      console.log(`• skill ya existe: ${name}`)
    } else {
      const [row] = await post("skills", { tenant_id: tenantId, name })
      skillIds[name] = row.id
      console.log(`✓ skill creada: ${name}`)
    }
  }

  // 2) Tipos de daño (service_issue_types) por skill
  for (const [name, types] of Object.entries(CATALOG)) {
    const skillId = skillIds[name]
    const existing = await get(
      `service_issue_types?tenant_id=eq.${tenantId}&skill_id=eq.${skillId}&select=name`,
    )
    const have = new Set(existing.map((r) => r.name.toLowerCase()))
    const toCreate = types
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !have.has(t.toLowerCase()))
      .map(({ t, i }) => ({
        tenant_id: tenantId,
        skill_id: skillId,
        name: t,
        display_order: i + 1,
      }))
    if (toCreate.length) {
      await post("service_issue_types", toCreate)
      console.log(`✓ ${name}: ${toCreate.length} tipos de daño`)
    } else {
      console.log(`• ${name}: tipos de daño ya existían`)
    }
  }

  // 3) Técnicos + skill + disponibilidad
  for (const t of TECHNICIANS) {
    let techId
    const existing = await get(
      `technicians?tenant_id=eq.${tenantId}&email=eq.${encodeURIComponent(t.email)}&deleted_at=is.null&select=id`,
    )
    if (existing.length) {
      techId = existing[0].id
      console.log(`• técnico ya existe: ${t.first} ${t.last}`)
    } else {
      const [row] = await post("technicians", {
        tenant_id: tenantId,
        first_name: t.first,
        last_name: t.last,
        email: t.email,
        status: "active",
      })
      techId = row.id
      console.log(`✓ técnico: ${t.first} ${t.last} — ${t.skill} (${t.level})`)
    }

    // technician_skills (upsert por PK compuesta)
    await fetch(
      `${BASE}/rest/v1/technician_skills?on_conflict=tenant_id,technician_id,skill_id`,
      {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          tenant_id: tenantId,
          technician_id: techId,
          skill_id: skillIds[t.skill],
          level: t.level,
        }),
      },
    )

    // disponibilidad Lun–Vie 08:00–17:00 (si no la tiene aún)
    const av = await get(
      `technician_availability?tenant_id=eq.${tenantId}&technician_id=eq.${techId}&select=id`,
    )
    if (!av.length) {
      await post(
        "technician_availability",
        WORK_DAYS.map((weekday) => ({
          tenant_id: tenantId,
          technician_id: techId,
          weekday,
          start_minute: DAY_START,
          end_minute: DAY_END,
        })),
      )
    }
  }

  console.log(`\n✓ Listo. 3 servicios, ${TECHNICIANS.length} técnicos y su catálogo en "${slug}".`)
  console.log(`  Reporte público: /r/${slug}`)
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message ?? e)
  process.exit(1)
})
