// Siembra incident_types (tipos de daño) por skill, por NOMBRE. Idempotente
// (sobrescribe la lista). No crea tablas. Aplica a todos los tenants que tengan
// la skill por nombre.
import { readFileSync } from "node:fs"
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }),
)
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
async function get(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json() }
async function patch(p, body) { const r = await fetch(`${URL}/rest/v1/${p}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`PATCH ${p} ${r.status} ${await r.text()}`); return r.json() }

const CATALOG = {
  "HVAC": ["No enfría", "No enciende", "Fuga de agua", "Ruido excesivo", "Temperatura incorrecta", "Mantenimiento preventivo"],
  "Refrigeración": ["No enfría", "Escarcha excesiva", "No enciende", "Ruido excesivo", "Fuga de refrigerante", "Mantenimiento preventivo"],
  "Electricidad": ["Sin energía", "Breaker disparado", "Cortocircuito", "Tomacorriente defectuoso", "Iluminación dañada", "Mantenimiento preventivo"],
  "Plomería": ["Fuga de agua", "Tubería tapada", "Inodoro dañado", "Grifo defectuoso", "Sin suministro", "Mantenimiento preventivo"],
  "Redes y cableado": ["Sin internet", "WiFi intermitente", "Puerto/switch caído", "Cableado dañado", "Equipo no conecta", "Mantenimiento preventivo"],
  "Mecánica general": ["No enciende", "Ruido o vibración", "Sobrecalentamiento", "Banda o correa", "Fuga", "Mantenimiento preventivo"],
}

let n = 0
for (const [name, types] of Object.entries(CATALOG)) {
  const rows = await patch(`skills?name=eq.${encodeURIComponent(name)}`, { incident_types: types })
  if (rows.length > 0) { n += rows.length; console.log(`✓ ${name}: ${types.length} tipos → ${rows.length} skill(s)`) }
  else console.log(`• ${name}: no existe en ningún tenant`)
}
console.log(`\nTotal skills actualizadas: ${n}`)
