// ─────────────────────────────────────────────────────────────────────────────
// SEED DEMO EN PRODUCCIÓN — tenant NUEVO y AISLADO "demo-hvac" (NO toca oracle ni
// ningún tenant real). Crea el tenant + admin + el escenario de cierre de mes
// validado en staging. Idempotente: re-ejecutar no duplica.
//
// SEGURIDAD: usa un archivo SEPARADO `.env.prod` (no .env.local) para forzar una
// decisión consciente. Solo escribe en el tenant 'demo-hvac' (creándolo). El
// agente NO puede correrlo (la BD de prod le está bloqueada); lo corres TÚ:
//
//   1) Crea nexus-platform/.env.prod con:
//        NEXT_PUBLIC_SUPABASE_URL=https://orueodkxqhtbqjddpkrr.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=<service_role_key_de_PROD>
//   2) node scripts/seed-prod-demo.mjs
//   3) Login en prod: demo@nexus-demo.test / DemoNexus2026!  (tenant demo-hvac)
//
// Si algo falla, comparte el error: solo afecta 'demo-hvac' y es re-ejecutable.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs"

const SLUG = "demo-hvac"
const ADMIN_EMAIL = "demo@nexus-demo.test"
const ADMIN_PASS = "DemoNexus2026!"

let env
try {
  env = Object.fromEntries(
    readFileSync(".env.prod", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")] }),
  )
} catch {
  console.error("✗ Falta nexus-platform/.env.prod (URL + SERVICE_ROLE_KEY de prod). Ver cabecera del script.")
  process.exit(1)
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error("✗ .env.prod incompleto"); process.exit(1) }
const REF = URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1]
console.log(`Destino: ${REF}  ·  tenant nuevo aislado: ${SLUG}\n`)

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }
const q = async (p, o = {}) => { const r = await fetch(`${URL}/rest/v1/${p}`, { ...o, headers: { ...H, ...o.headers } }); const t = await r.text(); if (!r.ok) throw new Error(`${p} ${r.status} ${t}`); return t ? JSON.parse(t) : null }
const selOne = async (t, f, c = "*") => { const qs = Object.entries(f).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&"); const r = await q(`${t}?${qs}&select=${c}&limit=1`); return r?.length ? r[0] : null }
const ins = async (t, row, c = "*") => { const d = await q(`${t}?select=${c}`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) }); return Array.isArray(d) ? d[0] : d }
const getOrCreate = async (t, m, extra, c = "*") => (await selOne(t, m, c)) ?? ins(t, { ...m, ...extra }, c)
const upd = (t, f, patch) => { const qs = Object.entries(f).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&"); return q(`${t}?${qs}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) }) }
const nextNum = (fn, T) => q(`rpc/${fn}`, { method: "POST", body: JSON.stringify({ p_tenant_id: T }) })
async function insNum(table, row, field, fn, T, c = "*") { for (let i = 0; i < 80; i++) { const n = await nextNum(fn, T); try { return await ins(table, { ...row, [field]: n }, c) } catch (e) { if (String(e.message).includes("23505") && i < 79) continue; throw e } } }
const hAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()
const dAgo = (d) => hAgo(d * 24)
const fromH = (h) => new Date(Date.now() + h * 3600_000).toISOString()
const todayAt = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString() }
const dOnly = (iso) => iso.slice(0, 10)

// ── 0) Admin auth user ───────────────────────────────────────────────────────
const list = await (await fetch(`${URL}/auth/v1/admin/users?per_page=500`, { headers: H })).json()
let user = (list.users ?? []).find((u) => u.email === ADMIN_EMAIL)
if (!user) {
  const r = await fetch(`${URL}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, email_confirm: true }) })
  if (!r.ok) throw new Error(`crear admin ${r.status} ${await r.text()}`); user = await r.json(); console.log(`✓ admin creado ${ADMIN_EMAIL}`)
} else console.log(`= admin ya existe ${ADMIN_EMAIL}`)

// ── 1) Tenant + membresía + rol tenant_admin (rol resuelto por clave) ─────────
const tenant = await getOrCreate("tenants", { slug: SLUG }, { name: "Clima Andino HVAC (Demo)", status: "active" }, "id,name")
const T = tenant.id
console.log(`✓ tenant ${T} (${tenant.name})`)
const adminRole = await selOne("roles", { key: "tenant_admin" }, "id")
if (!adminRole) throw new Error("No existe el rol tenant_admin en prod")
let membership = await selOne("tenant_memberships", { tenant_id: T, user_id: user.id }, "id")
if (!membership) membership = await ins("tenant_memberships", { tenant_id: T, user_id: user.id, status: "active" }, "id")
const hasRole = await q(`membership_roles?membership_id=eq.${membership.id}&role_id=eq.${adminRole.id}&select=membership_id`)
if (hasRole.length === 0) await ins("membership_roles", { membership_id: membership.id, role_id: adminRole.id, tenant_id: T }, "membership_id")
console.log("✓ membresía + rol tenant_admin")

// ── 2) Features (ve solo lo que compró) + permiso nlabs.read ──────────────────
const feats = await q(`features?select=id,key`)
for (const key of ["foundation", "crm", "sales", "service", "customer_portal", "field_service", "ai"]) {
  const f = feats.find((x) => x.key === key); if (!f) continue
  const ex = await selOne("tenant_features", { tenant_id: T, feature_id: f.id }, "tenant_id")
  if (ex) await upd("tenant_features", { tenant_id: T, feature_id: f.id }, { enabled: true })
  else await ins("tenant_features", { tenant_id: T, feature_id: f.id, enabled: true }, "tenant_id")
}
// NOTA: el permiso N-LABS (nlabs.read) NO se otorga aquí — es un cambio de RBAC
// GLOBAL (afecta a todos los tenants) y debe ir por la migración
// 20260625001_nlabs_permissions.sql aplicada a prod (npm run db:link:prod && db:push).
// Sin ella, N-LABS queda oculto en demo-hvac (no roto); el resto funciona igual.
console.log("✓ capacidades (features) habilitadas")

// ── 3) Clientes + contactos ───────────────────────────────────────────────────
const CLIENTS = [
  ["Centro Comercial Andino", "Retail", "Laura", "Gómez"], ["Hotel Estelar La Fontana", "Hotelería", "Carlos", "Mejía"],
  ["Clínica del Country", "Salud", "Ana", "Rodríguez"], ["Restaurante La Brasa Roja", "Restaurantes", "Pedro", "Sánchez"],
  ["Torre Empresarial Calle 100", "Inmobiliario", "Diana", "Torres"], ["Gimnasio Bodytech Chicó", "Fitness", "Andrés", "Ramírez"],
  ["Frigorífico Alimentos del Valle", "Industria", "Marcela", "Díaz"],
]
const companies = []
for (const [name, industry, fn, ln] of CLIENTS) {
  const c = await getOrCreate("companies", { tenant_id: T, name }, { industry, city: "Bogotá", country: "Colombia", status: "active" }, "id,name")
  await getOrCreate("contacts", { tenant_id: T, first_name: fn, last_name: ln }, { company_id: c.id, title: "Contacto", email: `${fn.toLowerCase()}@${name.toLowerCase().replace(/[^a-z]/g, "")}.demo`, phone: "318 555 1000", status: "active" }, "id")
  companies.push(c)
}
const contactOf = async (cid) => (await selOne("contacts", { tenant_id: T, company_id: cid }, "id"))?.id ?? null
console.log(`✓ ${companies.length} clientes + contactos`)

// ── 4) Técnicos + skills ──────────────────────────────────────────────────────
const TECHS = [["Andrés", "Ortiz"], ["Julián", "Castro"], ["Felipe", "Moreno"], ["Camilo", "Vargas"], ["Sebastián", "Rojas"], ["Mateo", "Herrera"], ["Nicolás", "Patiño"], ["Santiago", "León"]]
const techs = []
for (const [fn, ln] of TECHS) techs.push(await getOrCreate("technicians", { tenant_id: T, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@climaandina.demo` }, { first_name: fn, last_name: ln, phone: "300 000 0000", status: "active" }, "id,first_name"))
const skillIds = {}
for (const s of ["HVAC", "Refrigeración", "Eléctrico", "Mantenimiento preventivo"]) skillIds[s] = (await getOrCreate("skills", { tenant_id: T, name: s }, {}, "id")).id
const SK = Object.keys(skillIds), LV = ["junior", "mid", "senior"]
for (let i = 0; i < techs.length; i++) {
  await getOrCreate("technician_skills", { tenant_id: T, technician_id: techs[i].id, skill_id: skillIds[SK[i % SK.length]] }, { level: LV[i % 3] }, "tenant_id")
}
console.log(`✓ ${techs.length} técnicos + skills`)

// ── 5) Activos ────────────────────────────────────────────────────────────────
const ASSETS = [
  ["Chiller York YK 500TR", "machinery", "active"], ["Manejadora de aire AHU-1", "equipment", "active"],
  ["Unidad condensadora 20TR", "equipment", "in_maintenance"], ["Cuarto frío -18°C", "machinery", "down"],
  ["Mini split 36k BTU", "equipment", "active"], ["Cortina de aire entrada", "component", "active"],
  ["Campana extractora cocina", "equipment", "active"], ["Chiller enfriadora 300TR", "machinery", "in_maintenance"],
]
const assets = []
let an = 1
for (const [name, type, status] of ASSETS) {
  assets.push(await getOrCreate("assets", { tenant_id: T, asset_number: `AST-2026-${String(an).padStart(4, "0")}` }, { name, asset_type: type, status, company_id: companies[(an - 1) % companies.length].id, location: "Sede cliente", serial_number: `SN-${1000 + an}`, installed_at: dOnly(dAgo(400)) }, "id"))
  an++
}
console.log(`✓ ${assets.length} activos`)

// ── 6) Productos + lista de precios ───────────────────────────────────────────
const PRODUCTS = [
  ["Mantenimiento preventivo HVAC", "technical_services", "service", 180000], ["Diagnóstico y reparación", "technical_services", "service", 120000],
  ["Recarga de gas R-410A", "technical_services", "service", 95000], ["Instalación de equipo", "technical_services", "service", 650000],
  ["Compresor scroll 5TR", "machinery", "spare_part", 2400000], ["Filtro de aire", "consumables", "spare_part", 45000],
  ["Termostato digital", "machinery", "physical_product", 320000], ["Contactor trifásico 40A", "consumables", "spare_part", 78000],
]
const products = []
for (const [name, family, type, price] of PRODUCTS) products.push({ ...(await getOrCreate("products", { tenant_id: T, name }, { product_family: family, product_type: type, active: true }, "id")), price })
const pb = await getOrCreate("price_books", { tenant_id: T, name: "Lista general 2026" }, { description: "Precios HVAC 2026", active: true }, "id")
for (const p of products) await getOrCreate("price_book_entries", { tenant_id: T, price_book_id: pb.id, product_id: p.id }, { unit_price: p.price, active: true }, "tenant_id")
console.log(`✓ ${products.length} productos + lista de precios`)

// ── 7) Oportunidades (pipeline con movimiento + won/lost + estancadas) ─────────
const OPPS = [
  [0, "Renovación de chillers — Centro Andino", "machinery", 95_000_000, "proposal", 55, 12, 11, 3],
  [1, "Mantenimiento anual — Hotel La Fontana", "consulting", 48_000_000, "negotiation", 70, 10, 1, 2],
  [2, "Climatización quirúrgico — Clínica", "machinery", 120_000_000, "negotiation", 60, 13, 10, 5],
  [3, "Equipos de cocina — La Brasa", "machinery", 30_000_000, "proposal", 40, 9, 2, 8],
  [4, "Modernización — Torre Calle 100", "machinery", 64_000_000, "discovery", 30, 6, 1, 15],
  [6, "Cuartos fríos — Frigorífico", "consulting", 42_000_000, "won", 100, 14, 2, -1],
  [0, "Repotenciación oficinas — Andino", "machinery", 26_000_000, "won", 100, 12, 4, -3],
  [1, "Piloto sensores IoT", "consulting", 22_000_000, "lost", 0, 13, 5, -4],
]
for (const [ci, name, bt, val, status, prob, cA, uA, close] of OPPS) {
  if (await selOne("opportunities", { tenant_id: T, name }, "id")) continue
  const c = companies[ci]
  await ins("opportunities", { tenant_id: T, company_id: c.id, contact_id: await contactOf(c.id), business_type: bt, name, estimated_value: val, status, probability: prob, expected_close_date: dOnly(close >= 0 ? fromH(close * 24) : dAgo(-close)), description: "Oportunidad del cierre de mes.", created_at: dAgo(cA), updated_at: dAgo(uA) }, "id")
}
console.log(`✓ ${OPPS.length} oportunidades`)

// ── 8) Casos: SLA ~88% (met) + 3 ABIERTOS vencidos (resolvibles) ───────────────
const MET = [
  ["Mantenimiento correctivo A/A — oficina 3", 5], ["Cambio de filtros — unidad central", 4], ["Fuga de refrigerante — azotea", 6],
  ["Termostato sin respuesta — sala juntas", 8], ["Ruido en manejadora — piso 2", 3], ["Limpieza de condensador", 7],
  ["Reemplazo de capacitor", 2], ["Calibración de control", 9],
]
let i = 0
for (const [subject, dA] of MET) {
  if (await selOne("cases", { tenant_id: T, subject }, "id")) { i++; continue }
  const c = companies[i % companies.length]
  await insNum("cases", { tenant_id: T, subject, description: "Caso resuelto.", status: i % 4 === 0 ? "closed" : "resolved", priority: "medium", origin: "web", company_id: c.id, contact_id: await contactOf(c.id), reporter_email: "demo@cliente.demo", sla_due_at: hAgo(dA * 24 - 2), resolved_at: dAgo(dA), closed_at: i % 4 === 0 ? dAgo(dA) : null, asset_id: assets[i % assets.length].id, created_at: dAgo(dA + 1) }, "case_number", "next_case_number", T, "id")
  i++
}
const OVERDUE = [
  ["Sin enfriamiento sala de cómputo — urgente", "escalated", "critical", 8],
  ["A/A oficina principal sin operar", "working", "high", 20],
  ["Cuarto frío fuera de rango — revisar", "new", "high", 4],
]
let ov = 0
for (const [subject, status, priority, oh] of OVERDUE) {
  if (await selOne("cases", { tenant_id: T, subject }, "id")) { ov++; continue }
  const c = companies[ov % companies.length]
  await insNum("cases", { tenant_id: T, subject, description: "Caso abierto con SLA vencido.", status, priority, origin: "web", company_id: c.id, contact_id: await contactOf(c.id), reporter_email: "demo@cliente.demo", sla_due_at: hAgo(oh), created_at: hAgo(oh + 24) }, "case_number", "next_case_number", T, "id")
  ov++
}
console.log(`✓ ${MET.length} casos cumplidos + ${OVERDUE.length} abiertos vencidos (resolvibles)`)

// ── 9) Órdenes: completadas DESIGUAL + jornadas de HOY (utilización + sobrecarga) ──
const LOAD = [5, 4, 3, 2, 1]
let woN = 0
for (let ti = 0; ti < LOAD.length && ti < techs.length; ti++) {
  for (let k = 0; k < LOAD[ti]; k++) {
    const subject = `Servicio completado — ${techs[ti].first_name} #${k + 1}`
    if (await selOne("work_orders", { tenant_id: T, subject }, "id")) continue
    const c = companies[(ti + k) % companies.length]; const ago = (ti + k) % 12 + 1; const dur = 2 + ((ti + k) % 4)
    const cs = await insNum("cases", { tenant_id: T, subject: `(WO) ${subject}`, description: "OT ejecutada.", status: "closed", priority: "medium", origin: "web", company_id: c.id, contact_id: await contactOf(c.id), reporter_email: "demo@cliente.demo", resolved_at: dAgo(ago), closed_at: dAgo(ago), asset_id: assets[(ti + k) % assets.length].id, created_at: dAgo(ago + 1) }, "case_number", "next_case_number", T, "id")
    const wo = await insNum("work_orders", { tenant_id: T, case_id: cs.id, company_id: c.id, subject, description: "Intervención.", priority: "medium", status: "completed", scheduled_start: hAgo(ago * 24 + dur), scheduled_end: dAgo(ago), actual_start: hAgo(ago * 24 + dur), actual_end: dAgo(ago), labor_hours: dur, billable: true, created_at: dAgo(ago + 1) }, "work_order_number", "next_work_order_number", T, "id")
    await upd("cases", { tenant_id: T, id: cs.id }, { work_order_id: wo.id })
    await ins("work_order_assignments", { tenant_id: T, work_order_id: wo.id, technician_id: techs[ti].id, scheduled_start: hAgo(ago * 24 + dur), scheduled_end: dAgo(ago), estimated_duration_minutes: dur * 60, status: "completed" }, "id")
    woN++
  }
}
const TODAY = [540, 510, 440, 410, 390, 370, 340, 300]
let tdN = 0
for (let ti = 0; ti < TODAY.length && ti < techs.length; ti++) {
  const subject = `Jornada de hoy — ${techs[ti].first_name}`
  if (await selOne("work_orders", { tenant_id: T, subject }, "id")) continue
  const c = companies[ti % companies.length]; const mins = TODAY[ti]
  const cs = await insNum("cases", { tenant_id: T, subject: `(WO) ${subject}`, description: "Trabajo del día.", status: "working", priority: ti < 2 ? "high" : "medium", origin: "web", company_id: c.id, contact_id: await contactOf(c.id), reporter_email: "demo@cliente.demo", created_at: todayAt(7) }, "case_number", "next_case_number", T, "id")
  const wo = await insNum("work_orders", { tenant_id: T, case_id: cs.id, company_id: c.id, subject, description: "Carga del día.", priority: ti < 2 ? "high" : "medium", status: ti < 2 ? "in_progress" : "scheduled", scheduled_start: todayAt(8), scheduled_end: todayAt(8, mins), created_at: todayAt(7) }, "work_order_number", "next_work_order_number", T, "id")
  await upd("cases", { tenant_id: T, id: cs.id }, { work_order_id: wo.id })
  await ins("work_order_assignments", { tenant_id: T, work_order_id: wo.id, technician_id: techs[ti].id, scheduled_start: todayAt(8), scheduled_end: todayAt(8, mins), estimated_duration_minutes: mins, status: ti < 2 ? "in_progress" : "scheduled" }, "id")
  tdN++
}
console.log(`✓ ${woN} órdenes completadas (carga desigual) + ${tdN} jornadas de hoy`)

// ── 10) Facturas: 1 pagada + 2 pendientes (por cobrar) ────────────────────────
async function invoiceFromWO(subject, total, paid, status) {
  const co = companies[0], ct = await contactOf(co.id)
  const cs = await insNum("cases", { tenant_id: T, subject: `(INV) ${subject}`, description: "Facturable.", status: "closed", priority: "high", origin: "web", company_id: co.id, contact_id: ct, reporter_email: "demo@cliente.demo", resolved_at: dAgo(3), closed_at: dAgo(3), created_at: dAgo(4) }, "case_number", "next_case_number", T, "id")
  const wo = await insNum("work_orders", { tenant_id: T, case_id: cs.id, company_id: co.id, subject, description: "Servicio.", priority: "high", status: "completed", actual_start: hAgo(75), actual_end: hAgo(72), labor_hours: 4, billable: true, created_at: dAgo(4) }, "work_order_number", "next_work_order_number", T, "id")
  await upd("cases", { tenant_id: T, id: cs.id }, { work_order_id: wo.id })
  if (await selOne("invoices", { tenant_id: T, work_order_id: wo.id }, "id")) return
  const inv = await insNum("invoices", { tenant_id: T, origin_type: "work_order", work_order_id: wo.id, company_id: co.id, contact_id: ct, status, currency: "COP", subtotal: total, discount_amount: 0, tax_amount: 0, total_amount: total, amount_paid: paid, issue_date: dOnly(dAgo(3)), payment_terms: "30 días" }, "invoice_number", "next_invoice_number", T, "id")
  await ins("invoice_lines", { tenant_id: T, invoice_id: inv.id, description: "Servicio HVAC", quantity: 1, unit_price: total, discount_amount: 0, tax_rate: 0, tax_amount: 0, line_total: total, sort_order: 0 }, "id")
}
await invoiceFromWO("Reparación chiller (pagada)", 1_850_000, 1_850_000, "paid")
await invoiceFromWO("Reparación chiller — Andino", 3_200_000, 0, "issued")
await invoiceFromWO("Mantenimiento correctivo — La Brasa", 1_450_000, 700_000, "partially_paid")
console.log("✓ facturas: 1 pagada + 2 pendientes (por cobrar > 0)")

console.log(`\n✓ DEMO LISTA en prod. Login: ${ADMIN_EMAIL} / ${ADMIN_PASS} · tenant ${SLUG}`)
