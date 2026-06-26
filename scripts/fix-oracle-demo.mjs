// Diagnóstico + reparación de la demo de Oracle para que (1) el aviso por WhatsApp
// llegue a un número real y (2) el contador de ETA pueda calcularse.
//
// Dirigido por env: actúa sobre la DB a la que apunte .env.local (staging) o, si
// se pasan vars de prod, sobre prod. READ-ONLY por defecto; --apply repara.
//
// Diagnostica, por la WO indicada (default WO-2026-0006):
//   - el caso de origen: service_lat/lng, location_source, service_address, reporter_phone
//   - el último evento "voy en camino" en auditoría: ¿guardó ETA?
// Repara (--apply):
//   - reporter_phone → número real (default 3017099122)
//   - si faltan coords y hay dirección → geocodifica (Google) y las fija
//
// Uso:
//   node scripts/fix-oracle-demo.mjs                  # diagnóstico (staging)
//   node scripts/fix-oracle-demo.mjs --apply          # repara (staging)
//   node scripts/fix-oracle-demo.mjs --wo WO-2026-0006 --phone 3017099122 --apply
//   SUPABASE_URL=https://PROD.supabase.co SERVICE_ROLE_KEY=... node scripts/fix-oracle-demo.mjs --apply
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

// Prioriza vars de proceso (para apuntar a prod sin tocar .env.local).
const BASE = process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const GKEY = process.env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_API_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const val = (f, d) => {
  const i = args.indexOf(f)
  return i >= 0 && args[i + 1] ? args[i + 1] : d
}
const APPLY = has("--apply")
const SLUG = (val("--slug", "oracle")).toLowerCase()
const WO = val("--wo", "WO-2026-0006")
const PHONE = val("--phone", "3017099122")
const ASSIGNMENT = val("--assignment", null)
// Reubica el destino del servicio del caso a una dirección lejana (para demos del
// contador de ETA: distancia técnico↔cliente > 0 → llegada en el futuro → contador).
const RELOCATE = val("--relocate", null)

async function get(path) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`GET ${path} ${r.status} ${await r.text()}`)
  return r.json()
}
async function patch(path, body) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PATCH ${path} ${r.status} ${await r.text()}`)
  return r.json()
}

// Geocoding (mismos parámetros que google-geocoding.ts): bias Colombia.
async function geocode(address) {
  if (!GKEY || !address) return null
  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json")
  u.searchParams.set("address", address.slice(0, 200))
  u.searchParams.set("components", "country:CO")
  u.searchParams.set("region", "co")
  u.searchParams.set("key", GKEY)
  const r = await fetch(u)
  if (!r.ok) return null
  const j = await r.json()
  if (j.status !== "OK") return { error: j.status, j }
  const loc = j.results?.[0]?.geometry?.location
  if (!loc || typeof loc.lat !== "number") return null
  return { lat: loc.lat, lng: loc.lng, formatted: j.results?.[0]?.formatted_address ?? "" }
}

function line(k, v) {
  console.log(`  ${k.padEnd(18)} ${v}`)
}

// Inspección de una asignación que está rompiendo el render del worker. Dump crudo
// de la asignación + su WO + su caso para detectar nulos/anomalías de datos.
async function inspectAssignment(id) {
  console.log(`\n🔍 DB: ${BASE}`)
  console.log(`   inspeccionando asignación ${id}\n`)
  const asgs = await get(`work_order_assignments?id=eq.${id}&select=*`)
  if (!asgs.length) {
    console.log(`✗ No existe la asignación ${id} en esta DB.`)
    return
  }
  const a = asgs[0]
  console.log("📦 ASIGNACIÓN")
  for (const [k, v] of Object.entries(a)) line(k, v === null ? "— (NULL)" : JSON.stringify(v))

  if (a.work_order_id) {
    const wos = await get(`work_orders?id=eq.${a.work_order_id}&select=*`)
    const w = wos[0]
    console.log("\n🔧 WORK ORDER")
    if (!w) console.log("  ✗ WO referenciada NO existe (FK colgante).")
    else for (const k of ["work_order_number", "subject", "status", "case_id", "company_id", "scheduled_start", "scheduled_end"]) line(k, w[k] ?? "— (NULL)")

    if (w?.case_id) {
      const cs = await get(`cases?id=eq.${w.case_id}&select=id,subject,status,reporter_phone,tracking_token,service_lat,service_lng,issue_type_id`)
      const c = cs[0]
      console.log("\n📋 CASO")
      if (!c) console.log("  ✗ Caso referenciado NO existe (FK colgante).")
      else for (const k of ["subject", "status", "reporter_phone", "tracking_token", "service_lat", "service_lng", "issue_type_id"]) line(k, c[k] ?? "— (NULL)")
    }
  }

  const events = await get(
    `audit_events?subject_id=eq.${id}&event_type=in.(customer.enroute.sent,customer.enroute.skipped,customer.enroute.failed)&order=occurred_at.desc&limit=5&select=event_type,occurred_at,metadata`,
  )
  console.log(`\n🛰️  Eventos 'voy en camino' de esta asignación: ${events.length}`)
  for (const e of events) {
    const eta = e.metadata?.eta
    console.log(`  ${e.occurred_at?.slice(0, 19)} ${e.event_type}  eta=${eta ? `${eta.durationMinutes}min` : "— (sin ETA)"}`)
  }
  console.log("")
}

async function main() {
  if (ASSIGNMENT) return inspectAssignment(ASSIGNMENT)
  console.log(`\n🔍 DB: ${BASE}`)
  console.log(`   modo: ${APPLY ? "APPLY (repara)" : "diagnóstico (read-only)"} · WO=${WO} · slug=${SLUG}\n`)

  const tenants = await get(`tenants?slug=eq.${SLUG}&select=id,name`)
  if (!tenants.length) {
    console.log(`✗ No existe el tenant '${SLUG}' en esta DB. (¿estás apuntando a la DB correcta?)`)
    return
  }
  const tenant = tenants[0]
  console.log(`Tenant: ${tenant.name} (${tenant.id})`)

  const wos = await get(
    `work_orders?tenant_id=eq.${tenant.id}&work_order_number=eq.${WO}&select=id,case_id,company_id,subject`,
  )
  if (!wos.length) {
    console.log(`✗ No existe ${WO} en esta DB.`)
    return
  }
  const wo = wos[0]
  console.log(`WO: ${wo.subject} (${wo.id})  case_id=${wo.case_id ?? "—"}\n`)

  if (!wo.case_id) {
    console.log("✗ La WO no tiene caso de origen → no hay teléfono ni dirección de cliente.")
    return
  }

  const cases = await get(
    `cases?id=eq.${wo.case_id}&select=id,subject,reporter_phone,reporter_email,service_lat,service_lng,service_address,location_source`,
  )
  const c = cases[0]
  console.log("📋 CASO DE ORIGEN")
  line("reporter_phone", c.reporter_phone ?? "— (NULL)")
  line("reporter_email", c.reporter_email ?? "— (NULL)")
  line("service_lat", c.service_lat ?? "— (NULL)")
  line("service_lng", c.service_lng ?? "— (NULL)")
  line("location_source", c.location_source ?? "— (NULL)")
  line("service_address", c.service_address ?? "— (NULL)")

  const hasCoords = c.service_lat != null && c.service_lng != null
  console.log(
    `\n  → ETA ${hasCoords ? "PUEDE calcularse (hay coords)" : "IMPOSIBLE: faltan coords del sitio"}.` +
      (hasCoords ? " Si aún no aparece, revisar Directions API + key en Vercel." : ""),
  )

  // Reubicar destino lejano: el ETA sale 0 min cuando técnico y cliente están en el
  // mismo lugar (demo desde un equipo). Mover el destino del cliente lejos hace que
  // un "Voy en camino" desde tu ubicación dé un ETA > 0 y el contador corra.
  if (RELOCATE) {
    console.log(`\n📍 Reubicando el destino del cliente a "${RELOCATE}"…`)
    const g = await geocode(RELOCATE)
    if (g?.lat) {
      await patch(`cases?id=eq.${c.id}`, {
        service_lat: g.lat,
        service_lng: g.lng,
        location_source: "geocoded",
        service_address: g.formatted || RELOCATE,
      })
      console.log(`  ✓ Nuevo destino: ${g.lat},${g.lng} (${g.formatted})`)
      console.log(`  → Ahora un "Voy en camino" NUEVO (lejos de ahí) dará ETA > 0 y el contador correrá.`)
    } else if (g?.error) {
      console.log(`  ✗ Geocoding status=${g.error} (revisa la dirección o la API).`)
    } else {
      console.log(`  ✗ No se pudo geocodificar esa dirección.`)
    }
    return
  }

  // Último aviso "voy en camino" en auditoría: ¿guardó ETA?
  const events = await get(
    `audit_events?tenant_id=eq.${tenant.id}&event_type=in.(customer.enroute.sent,customer.enroute.skipped,customer.enroute.failed)&order=occurred_at.desc&limit=5&select=event_type,occurred_at,metadata`,
  )
  console.log(`\n🛰️  Eventos 'voy en camino' recientes del tenant: ${events.length}`)
  for (const e of events) {
    const eta = e.metadata?.eta
    console.log(
      `  ${e.occurred_at?.slice(0, 19)} ${e.event_type}  eta=${eta ? `${eta.durationMinutes}min → ${eta.arrivalAt?.slice(11, 16)}` : "— (sin ETA)"}`,
    )
  }

  // Prueba de geocoding en vivo (no muta): valida key + Geocoding API habilitada.
  if (!hasCoords && c.service_address && GKEY) {
    console.log(`\n🌐 Probando Geocoding de "${c.service_address}"…`)
    const g = await geocode(c.service_address)
    if (g?.lat) console.log(`  ✓ Geocoding OK → ${g.lat},${g.lng} (${g.formatted})`)
    else if (g?.error) console.log(`  ✗ Geocoding status=${g.error} (¿API habilitada? ¿billing?)`)
    else console.log(`  ✗ Geocoding falló (sin key / dirección no resoluble).`)
  }

  if (!APPLY) {
    console.log(`\nℹ️  Read-only. Para reparar: agrega --apply\n`)
    return
  }

  // ---- REPARACIÓN ----
  console.log(`\n🔧 Reparando…`)
  const patchBody = {}
  if (c.reporter_phone !== PHONE) {
    patchBody.reporter_phone = PHONE
    console.log(`  · reporter_phone: ${c.reporter_phone ?? "—"} → ${PHONE}`)
  } else {
    console.log(`  · reporter_phone ya es ${PHONE}`)
  }
  if (!hasCoords && c.service_address && GKEY) {
    const g = await geocode(c.service_address)
    if (g?.lat) {
      patchBody.service_lat = g.lat
      patchBody.service_lng = g.lng
      patchBody.location_source = "geocoded"
      if (g.formatted) patchBody.service_address = g.formatted
      console.log(`  · coords: NULL → ${g.lat},${g.lng} (geocoded)`)
    } else {
      console.log(`  · coords: no se pudieron geocodificar (revisa Geocoding API/key).`)
    }
  }
  if (Object.keys(patchBody).length === 0) {
    console.log(`  Nada que cambiar.`)
    return
  }
  await patch(`cases?id=eq.${c.id}`, patchBody)
  console.log(`  ✓ Caso actualizado.`)
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message)
  process.exit(1)
})
