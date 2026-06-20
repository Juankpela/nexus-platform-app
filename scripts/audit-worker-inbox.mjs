// Solo lectura: ¿por qué un técnico no ve "Aceptar"? Lista, por técnico con
// login, sus asignaciones y el estado de la EJECUCIÓN (que es lo que decide el
// botón). Si no hay fila de ejecución, el detalle lo trata como "pending".
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
if (!BASE || !KEY) throw new Error("Faltan envs")

async function q(path) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

for (const SLUG of ["oracle", "huella-global"]) {
  const [tenant] = await q(`tenants?slug=eq.${SLUG}&select=id,name`)
  if (!tenant) {
    console.log(`\n### ${SLUG}: NO EXISTE`)
    continue
  }
  const t = tenant.id
  console.log(`\n================ TENANT ${tenant.name} (${SLUG}) ================`)

  const techs = await q(
    `technicians?tenant_id=eq.${t}&deleted_at=is.null&select=id,first_name,last_name,user_id,status`,
  )
  for (const tech of techs) {
    const name = `${tech.first_name} ${tech.last_name}`
    const login = tech.user_id ? "con login" : "SIN login"
    const asg = await q(
      `work_order_assignments?tenant_id=eq.${t}&technician_id=eq.${tech.id}` +
        `&select=id,scheduled_start,status,work_orders(work_order_number,status,subject),` +
        `work_order_executions(status)&order=scheduled_start.desc`,
    )
    if (asg.length === 0) continue
    console.log(`\n  ▶ ${name} [${login}, tech ${tech.status}]`)
    for (const a of asg) {
      const wo = a.work_orders
      const exec = a.work_order_executions?.[0]
      const execStatus = exec?.status ?? "(sin ejecución → pending)"
      const verBoton =
        execStatus === "pending" || execStatus === "(sin ejecución → pending)" ? "  ✅ MUESTRA «Aceptar»" : ""
      console.log(
        `      ${wo?.work_order_number ?? "?"} | WO=${wo?.status} | asg=${a.status} | exec=${execStatus}${verBoton}`,
      )
    }
  }
}
console.log("\n(fin)")
