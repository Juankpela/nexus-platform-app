// Auditoría de solo lectura del motor Nexus para huella-global (datos reales).
// Lee .env.local, consulta PostgREST con service-role y vuelca el estado del
// motor: skills+aliases, técnicos, skills por técnico, disponibilidad, capacidad,
// casos recientes. NO escribe nada.
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
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

async function q(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

const SLUG = "huella-global"
const [tenant] = await q(`tenants?slug=eq.${SLUG}&select=id,name`)
if (!tenant) throw new Error(`No tenant ${SLUG}`)
const t = tenant.id
console.log(`TENANT: ${tenant.name} (${t})\n`)

const skills = await q(`skills?tenant_id=eq.${t}&select=id,name,aliases`)
console.log("=== SKILLS + ALIASES ===")
for (const s of skills) console.log(`  ${s.name} [${s.id.slice(0, 8)}] aliases: ${JSON.stringify(s.aliases)}`)

const techs = await q(
  `technicians?tenant_id=eq.${t}&deleted_at=is.null&select=id,first_name,last_name,status,max_work_orders_per_day,max_minutes_per_day`,
)
console.log("\n=== TÉCNICOS ===")
for (const x of techs)
  console.log(
    `  ${x.first_name} ${x.last_name} [${x.id.slice(0, 8)}] status=${x.status} cap=${x.max_work_orders_per_day}wo/${x.max_minutes_per_day}min`,
  )

const tskills = await q(`technician_skills?tenant_id=eq.${t}&select=technician_id,skill_id,level`)
const skillName = Object.fromEntries(skills.map((s) => [s.id, s.name]))
const techName = Object.fromEntries(techs.map((x) => [x.id, `${x.first_name} ${x.last_name}`]))
console.log("\n=== SKILLS POR TÉCNICO ===")
const byTech = {}
for (const r of tskills) (byTech[r.technician_id] ??= []).push(`${skillName[r.skill_id] ?? r.skill_id.slice(0,8)}:${r.level}`)
for (const x of techs) console.log(`  ${techName[x.id]}: ${(byTech[x.id] ?? ["(sin skills)"]).join(", ")}`)

const avail = await q(`technician_availability?tenant_id=eq.${t}&select=technician_id,weekday,start_minute,end_minute&order=weekday`)
console.log("\n=== DISPONIBILIDAD (ventanas) ===")
const av = {}
for (const r of avail) (av[r.technician_id] ??= []).push(`d${r.weekday} ${Math.floor(r.start_minute/60)}:00-${Math.floor(r.end_minute/60)}:00`)
for (const x of techs) console.log(`  ${techName[x.id]}: ${(av[x.id] ?? ["(sin ventanas)"]).join(" · ")}`)

const exc = await q(`technician_availability_exceptions?tenant_id=eq.${t}&select=technician_id,date_from,date_to,kind`)
console.log(`\n=== EXCEPCIONES DE AGENDA: ${exc.length} ===`)
for (const e of exc) console.log(`  ${techName[e.technician_id] ?? e.technician_id.slice(0,8)}: ${e.date_from}..${e.date_to} ${e.kind}`)

const cases = await q(`cases?tenant_id=eq.${t}&select=case_number,subject,status,created_at&order=created_at.desc&limit=8`)
console.log("\n=== CASOS RECIENTES ===")
for (const c of cases) console.log(`  ${c.case_number} [${c.status}] ${c.subject?.slice(0, 70)}`)

const asg = await q(`work_order_assignments?tenant_id=eq.${t}&select=technician_id,scheduled_start,status&order=scheduled_start.desc&limit=10`)
console.log(`\n=== ASIGNACIONES (10 últimas) ===`)
for (const a of asg) console.log(`  ${techName[a.technician_id] ?? a.technician_id?.slice(0,8)} ${a.scheduled_start} [${a.status}]`)
