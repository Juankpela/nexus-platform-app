/**
 * Seed de datos CRM de demostración para el tenant huella-global.
 * Inserta: 18 empresas, 42 contactos, 25 oportunidades.
 * Sector: flexografía / empaques / maquinaria industrial (Colombia).
 *
 * Uso:
 *   node scripts/seed-crm-demo.mjs [tenantSlug]
 *
 * Por defecto usa el slug "huella-global". Requiere .env.local con
 * NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from "node:fs"

// ── Cargar .env.local ──────────────────────────────────────────────────────
function loadEnv(path) {
  const env = {}
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1)
      env[key] = val
    }
  } catch (e) {
    console.error("No pude leer .env.local:", e.message)
    process.exit(1)
  }
  return env
}

const env = loadEnv(".env.local")
const URL  = env.NEXT_PUBLIC_SUPABASE_URL
const KEY  = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const SLUG = process.argv[2] ?? "huella-global"

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
}

async function rest(path, opts = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...opts.headers } })
  const txt = await r.text()
  const body = txt ? JSON.parse(txt) : null
  if (!r.ok) throw new Error(`${r.status} ${path} — ${txt}`)
  return body
}

async function insert(table, rows) {
  return rest(`${table}?select=id`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  })
}

// ── 1. Resolver tenant ─────────────────────────────────────────────────────
async function getTenant(slug) {
  const rows = await rest(`tenants?slug=eq.${slug}&select=id,name`)
  if (!rows.length) {
    console.error(`No existe el tenant con slug "${slug}". Créalo primero con seed-tenant.mjs.`)
    process.exit(1)
  }
  return rows[0]
}

// ── Datos de demostración ──────────────────────────────────────────────────

const COMPANIES_RAW = [
  { name: "Plastilene S.A.S.",           industry: "Empaques flexibles",    city: "Medellín",    state: "Antioquia",       country: "Colombia", phone: "+57 4 444 0100" },
  { name: "Carvajal Empaques S.A.",       industry: "Empaques y cartón",     city: "Cali",        state: "Valle del Cauca", country: "Colombia", phone: "+57 2 688 9000" },
  { name: "Smurfit Kappa Colombia S.A.", industry: "Cartón corrugado",       city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 742 8000" },
  { name: "Propac S.A.S.",               industry: "Empaques flexibles",    city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 260 3300" },
  { name: "Tecnopack Ltda.",             industry: "Maquinaria empaque",     city: "Barranquilla", state: "Atlántico",      country: "Colombia", phone: "+57 5 385 1200" },
  { name: "Impresores del Valle S.A.S.", industry: "Artes gráficas",         city: "Cali",        state: "Valle del Cauca", country: "Colombia", phone: "+57 2 550 7800" },
  { name: "Litografía Colombia S.A.S.", industry: "Artes gráficas",          city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 340 5900" },
  { name: "Flexo Andina S.A.S.",         industry: "Flexografía",            city: "Medellín",    state: "Antioquia",       country: "Colombia", phone: "+57 4 260 1500" },
  { name: "Etiquetas Modernas S.A.S.",   industry: "Etiquetas y stickers",   city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 410 2200" },
  { name: "Polybag S.A.S.",              industry: "Empaques plásticos",     city: "Manizales",   state: "Caldas",          country: "Colombia", phone: "+57 6 874 0300" },
  { name: "Meflex S.A.S.",               industry: "Materiales flexográficos", city: "Bogotá",   state: "Cundinamarca",    country: "Colombia", phone: "+57 1 590 4400" },
  { name: "Industrias Gráficas del Norte S.A.S.", industry: "Artes gráficas", city: "Bucaramanga", state: "Santander",    country: "Colombia", phone: "+57 7 630 5500" },
  { name: "Grafitalia Colombia S.A.S.",  industry: "Tintas y barnices",      city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 411 6600" },
  { name: "Corrugados del Caribe S.A.S.",industry: "Cartón corrugado",       city: "Barranquilla", state: "Atlántico",      country: "Colombia", phone: "+57 5 350 7700" },
  { name: "Empaques Versátiles S.A.S.", industry: "Empaques flexibles",      city: "Pereira",     state: "Risaralda",       country: "Colombia", phone: "+57 6 325 8800" },
  { name: "Printex Colombia S.A.S.",     industry: "Artes gráficas",         city: "Cali",        state: "Valle del Cauca", country: "Colombia", phone: "+57 2 444 9900" },
  { name: "Labelmex S.A.S.",             industry: "Etiquetas y stickers",   city: "Bogotá",      state: "Cundinamarca",    country: "Colombia", phone: "+57 1 301 1010" },
  { name: "Empaques del Pacífico S.A.S.",industry: "Empaques flexibles",     city: "Buenaventura", state: "Valle del Cauca", country: "Colombia", phone: "+57 2 241 1100" },
]

// 42 contactos distribuidos en 18 empresas
const CONTACTS_RAW = [
  // Plastilene
  { ci: 0, first_name: "Jorge",    last_name: "Restrepo",   email: "j.restrepo@plastilene.com.co",   title: "Gerente de Compras",      department: "Compras"     },
  { ci: 0, first_name: "Marcela",  last_name: "Ríos",       email: "m.rios@plastilene.com.co",        title: "Jefa de Producción",      department: "Producción"  },
  { ci: 0, first_name: "Andrés",   last_name: "Salazar",    email: "a.salazar@plastilene.com.co",     title: "Director Técnico",        department: "Técnico"     },
  // Carvajal Empaques
  { ci: 1, first_name: "Claudia",  last_name: "Moreno",     email: "c.moreno@carvajal.com",           title: "Gerente de Operaciones",  department: "Operaciones" },
  { ci: 1, first_name: "Ricardo",  last_name: "Castro",     email: "r.castro@carvajal.com",           title: "Jefe de Calidad",         department: "Calidad"     },
  // Smurfit Kappa
  { ci: 2, first_name: "Valentina",last_name: "Herrera",    email: "v.herrera@smurfitkappa.com",      title: "Procurement Manager",     department: "Compras"     },
  { ci: 2, first_name: "Felipe",   last_name: "Vargas",     email: "f.vargas@smurfitkappa.com",       title: "Plant Manager",           department: "Producción"  },
  // Propac
  { ci: 3, first_name: "Diana",    last_name: "González",   email: "d.gonzalez@propac.com.co",        title: "Gerente Comercial",       department: "Comercial"   },
  { ci: 3, first_name: "Camilo",   last_name: "Ortega",     email: "c.ortega@propac.com.co",          title: "Coordinador de Compras",  department: "Compras"     },
  // Tecnopack
  { ci: 4, first_name: "Luis",     last_name: "Peñaloza",   email: "l.penaloza@tecnopack.com.co",     title: "Gerente General",         department: "Gerencia"    },
  { ci: 4, first_name: "Sandra",   last_name: "Mejía",      email: "s.mejia@tecnopack.com.co",        title: "Ingeniera de Proyectos",  department: "Ingeniería"  },
  // Impresores del Valle
  { ci: 5, first_name: "Carlos",   last_name: "Palomino",   email: "c.palomino@imprval.com.co",       title: "Director de Planta",      department: "Producción"  },
  { ci: 5, first_name: "Natalia",  last_name: "Agudelo",    email: "n.agudelo@imprval.com.co",        title: "Jefa de Compras",         department: "Compras"     },
  // Litografía Colombia
  { ci: 6, first_name: "Eduardo",  last_name: "Sánchez",    email: "e.sanchez@litocolombia.com",      title: "Gerente de Operaciones",  department: "Operaciones" },
  { ci: 6, first_name: "Patricia", last_name: "Ruiz",       email: "p.ruiz@litocolombia.com",         title: "Supervisora Técnica",     department: "Técnico"     },
  // Flexo Andina
  { ci: 7, first_name: "Mauricio", last_name: "Londoño",    email: "m.londono@flexoandina.com.co",    title: "CEO",                     department: "Gerencia"    },
  { ci: 7, first_name: "Sofía",    last_name: "Cardona",    email: "s.cardona@flexoandina.com.co",    title: "Gerente Técnica",         department: "Técnico"     },
  { ci: 7, first_name: "Julián",   last_name: "Torres",     email: "j.torres@flexoandina.com.co",     title: "Comprador Senior",        department: "Compras"     },
  // Etiquetas Modernas
  { ci: 8, first_name: "María",    last_name: "Jiménez",    email: "m.jimenez@etiquetasmodernas.com", title: "Directora de Compras",    department: "Compras"     },
  { ci: 8, first_name: "Sebastián",last_name: "Pardo",      email: "s.pardo@etiquetasmodernas.com",   title: "Jefe de Planta",          department: "Producción"  },
  // Polybag
  { ci: 9, first_name: "Adriana",  last_name: "Ospina",     email: "a.ospina@polybag.com.co",         title: "Gerente de Compras",      department: "Compras"     },
  { ci: 9, first_name: "Hernando", last_name: "Cano",       email: "h.cano@polybag.com.co",           title: "Director Técnico",        department: "Técnico"     },
  // Meflex
  { ci:10, first_name: "Carolina", last_name: "Betancourt", email: "c.betancourt@meflex.com.co",      title: "Gerente General",         department: "Gerencia"    },
  { ci:10, first_name: "Alejandro",last_name: "Giraldo",    email: "a.giraldo@meflex.com.co",         title: "Coordinador de Proyectos",department: "Proyectos"   },
  // Industrias Gráficas del Norte
  { ci:11, first_name: "Roberto",  last_name: "Quintero",   email: "r.quintero@ignorte.com.co",       title: "Gerente Comercial",       department: "Comercial"   },
  { ci:11, first_name: "Luz",      last_name: "Machado",    email: "l.machado@ignorte.com.co",        title: "Jefa de Producción",      department: "Producción"  },
  // Grafitalia Colombia
  { ci:12, first_name: "Iván",     last_name: "Muñoz",      email: "i.munoz@grafitalia.com.co",       title: "Gerente de Ventas",       department: "Ventas"      },
  { ci:12, first_name: "Laura",    last_name: "Suárez",     email: "l.suarez@grafitalia.com.co",      title: "Directora de Compras",    department: "Compras"     },
  { ci:12, first_name: "Nicolás",  last_name: "Álvarez",    email: "n.alvarez@grafitalia.com.co",     title: "Químico Industrial",      department: "Técnico"     },
  // Corrugados del Caribe
  { ci:13, first_name: "Yesenia",  last_name: "Fuentes",    email: "y.fuentes@corrugadoscaribe.com",  title: "Gerente de Operaciones",  department: "Operaciones" },
  { ci:13, first_name: "Manuel",   last_name: "Barrios",    email: "m.barrios@corrugadoscaribe.com",  title: "Jefe de Compras",         department: "Compras"     },
  // Empaques Versátiles
  { ci:14, first_name: "Paola",    last_name: "Acosta",     email: "p.acosta@empversatiles.com.co",   title: "Gerente General",         department: "Gerencia"    },
  { ci:14, first_name: "Diego",    last_name: "Ramírez",    email: "d.ramirez@empversatiles.com.co",  title: "Coordinador Técnico",     department: "Técnico"     },
  // Printex Colombia
  { ci:15, first_name: "Gloria",   last_name: "Calderón",   email: "g.calderon@printex.com.co",       title: "Jefa de Planta",          department: "Producción"  },
  { ci:15, first_name: "Pablo",    last_name: "Estrada",    email: "p.estrada@printex.com.co",        title: "Gerente de Compras",      department: "Compras"     },
  // Labelmex
  { ci:16, first_name: "Tatiana",  last_name: "Mora",       email: "t.mora@labelmex.com.co",          title: "Directora Comercial",     department: "Comercial"   },
  { ci:16, first_name: "Jhon",     last_name: "Useche",     email: "j.useche@labelmex.com.co",        title: "Jefe de Producción",      department: "Producción"  },
  // Empaques del Pacífico
  { ci:17, first_name: "Yolanda",  last_name: "Palacios",   email: "y.palacios@empacifico.com.co",    title: "Gerente de Compras",      department: "Compras"     },
  { ci:17, first_name: "Cristian", last_name: "Lozano",     email: "c.lozano@empacifico.com.co",      title: "Coordinador Técnico",     department: "Técnico"     },
  { ci:17, first_name: "Beatriz",  last_name: "Hurtado",    email: "b.hurtado@empacifico.com.co",     title: "Jefa de Calidad",         department: "Calidad"     },
]

// 25 oportunidades — mezcla de estados (incluyendo won/lost para métricas)
// ci = índice de empresa, cci = índice de contacto (relativo al CONTACTS_RAW)
// status: new | discovery | proposal | negotiation | won | lost
const OPPS_RAW = [
  // WON (para mostrar ingresos reales)
  { ci:0,  cci:0,  name:"Suministro anual clichés flexo Plastilene 2024",      type:"flexography", value:48000000,  prob:100, status:"won",         close:"2024-11-30", desc:"Contrato cerrado por clichés para línea de producción de snacks." },
  { ci:7,  cci:15, name:"Renovación tintas UV Flexo Andina Q1 2025",           type:"inks",        value:32000000,  prob:100, status:"won",         close:"2025-03-15", desc:"Tintas UV para sus tres prensas Mark Andy. Pedido recurrente." },
  { ci:12, cci:26, name:"Tintas base agua Grafitalia Colombia 2024",           type:"inks",        value:24000000,  prob:100, status:"won",         close:"2024-12-20", desc:"Portafolio completo de tintas base agua para producción de empaques." },
  { ci:4,  cci:9,  name:"Mantenimiento preventivo prensas Tecnopack",          type:"machinery",   value:18500000,  prob:100, status:"won",         close:"2025-01-10", desc:"Mantenimiento y calibración de 4 prensas flexo." },

  // LOST
  { ci:2,  cci:5,  name:"Clichés Smurfit Kappa — proceso perdido",             type:"flexography", value:55000000,  prob:0,   status:"lost",        close:"2024-10-01", desc:"Competidor ofreció precio 22% menor. Reevaluar propuesta de valor." },
  { ci:13, cci:29, name:"Corrugados del Caribe — tintas solventadas",          type:"inks",        value:15000000,  prob:0,   status:"lost",        close:"2024-09-15", desc:"Cliente decidió traer tintas directamente del fabricante en China." },

  // NEGOTIATION
  { ci:1,  cci:3,  name:"Contrato anual consumibles Carvajal Empaques",        type:"consumables", value:68000000,  prob:80,  status:"negotiation", close:"2025-07-31", desc:"Negociación de contrato marco anual para adhesivos, solventes y repuestos." },
  { ci:8,  cci:18, name:"Expansión portafolio Etiquetas Modernas",             type:"flexography", value:41000000,  prob:75,  status:"negotiation", close:"2025-08-15", desc:"Adición de clichés digitales a contrato existente. Pendiente firma OC." },
  { ci:10, cci:22, name:"Proyecto turnkey Meflex — planta nueva",              type:"machinery",   value:210000000, prob:70,  status:"negotiation", close:"2025-09-30", desc:"Equipamiento completo para nueva planta de materiales flexográficos." },
  { ci:5,  cci:11, name:"Servicio completo tintas Impresores del Valle",       type:"inks",        value:36000000,  prob:65,  status:"negotiation", close:"2025-07-20", desc:"Propuesta ganó técnicamente, en negociación comercial final." },

  // PROPOSAL
  { ci:3,  cci:7,  name:"Suministro clichés HD Propac S.A.S. 2025-2026",      type:"flexography", value:52000000,  prob:55,  status:"proposal",    close:"2025-09-01", desc:"Propuesta de clichés HD para nueva línea de café y alimentos." },
  { ci:14, cci:31, name:"Consumibles y repuestos Empaques Versátiles",         type:"consumables", value:22000000,  prob:50,  status:"proposal",    close:"2025-08-30", desc:"Propuesta enviada, esperando validación técnica del área de producción." },
  { ci:9,  cci:20, name:"Tintas especiales Polybag — empaques retortables",    type:"inks",        value:29500000,  prob:45,  status:"proposal",    close:"2025-10-15", desc:"Tintas para empaques retortables alta temperatura. Requiere pruebas." },
  { ci:16, cci:36, name:"Clichés digitales Labelmex etiquetas premium",        type:"flexography", value:17000000,  prob:50,  status:"proposal",    close:"2025-08-01", desc:"Transición de clichés análogos a digitales para etiquetas premium." },

  // DISCOVERY
  { ci:6,  cci:13, name:"Optimización tintas Litografía Colombia",             type:"inks",        value:38000000,  prob:30,  status:"discovery",   close:"2025-11-30", desc:"Cliente busca reducir merma en consumo de tintas. Fase de diagnóstico." },
  { ci:15, cci:33, name:"Renovación equipos Printex Colombia",                 type:"machinery",   value:145000000, prob:25,  status:"discovery",   close:"2026-01-15", desc:"Cotización preliminar para renovación de dos prensas centrales CI." },
  { ci:11, cci:24, name:"Consultoría procesos Industrias Gráficas Norte",      type:"consulting",  value:12000000,  prob:35,  status:"discovery",   close:"2025-10-01", desc:"Diagnóstico de eficiencia en sala de tintas y consumo de clichés." },
  { ci:17, cci:38, name:"Empaques del Pacífico — tintas y consumibles",        type:"inks",        value:26000000,  prob:30,  status:"discovery",   close:"2025-12-01", desc:"Cliente nuevo. Reunión de diagnóstico realizada, presentando portafolio." },

  // NEW
  { ci:3,  cci:8,  name:"Propac — clichés línea flexible snacks",              type:"flexography", value:31000000,  prob:20,  status:"new",         close:"2025-12-15", desc:"Referido por Plastilene. Primera reunión agendada." },
  { ci:1,  cci:4,  name:"Carvajal — consultoría reducción waste tintas",       type:"consulting",  value:9500000,   prob:15,  status:"new",         close:"2025-11-01", desc:"Solicitud entrada por formulario web. Priorizar contacto." },
  { ci:6,  cci:14, name:"Litografía Colombia — consumibles nuevo contrato",    type:"consumables", value:19000000,  prob:20,  status:"new",         close:"2026-01-31", desc:"Contrato anterior venció. Retomar relación comercial." },
  { ci:12, cci:28, name:"Grafitalia — tintas UV para línea digital",           type:"inks",        value:44000000,  prob:15,  status:"new",         close:"2026-02-28", desc:"Están instalando prensa digital inkjet, necesitarán tintas UV especiales." },
  { ci:0,  cci:1,  name:"Plastilene — expansión clichés línea Andina",        type:"flexography", value:35000000,  prob:20,  status:"new",         close:"2025-12-31", desc:"Ampliación del contrato actual a nueva línea de producción." },
  { ci:4,  cci:10, name:"Tecnopack — capacitación técnica operadores",         type:"consulting",  value:6500000,   prob:25,  status:"new",         close:"2025-10-30", desc:"Solicitud de programa de entrenamiento para 8 operadores de prensa." },
  { ci:8,  cci:19, name:"Etiquetas Modernas — adhesivos high-tack",            type:"consumables", value:13500000,  prob:20,  status:"new",         close:"2025-11-15", desc:"Requerimiento urgente para etiquetas especiales de congelados." },
]

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱  Seed CRM demo → tenant: ${SLUG}\n`)

  // 1. Tenant
  const tenant = await getTenant(SLUG)
  const tenantId = tenant.id
  console.log(`✓  Tenant: ${tenant.name} (${tenantId})`)

  // 2. Verificar que no haya datos existentes para no duplicar
  const existingCo = await rest(`companies?tenant_id=eq.${tenantId}&select=id&limit=1`)
  if (existingCo.length > 0) {
    console.warn("\n⚠️  Ya existen empresas en este tenant. Ejecuta el seed solo una vez.")
    console.warn("   Para re-seedear, elimina los datos manualmente desde Supabase Studio.\n")
    process.exit(0)
  }

  // 3. Insertar empresas
  console.log(`\n📦  Insertando ${COMPANIES_RAW.length} empresas...`)
  const coRows = COMPANIES_RAW.map((c) => ({
    tenant_id: tenantId,
    name: c.name,
    industry: c.industry,
    city: c.city,
    state: c.state,
    country: c.country,
    phone: c.phone,
    status: "active",
  }))
  const companies = await insert("companies", coRows)
  console.log(`   ✓ ${companies.length} empresas creadas`)

  // Mapa índice → id real
  const coId = companies.map((c) => c.id)

  // 4. Insertar contactos
  console.log(`\n👥  Insertando ${CONTACTS_RAW.length} contactos...`)
  const ctRows = CONTACTS_RAW.map((c) => ({
    tenant_id: tenantId,
    company_id: coId[c.ci],
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    title: c.title,
    department: c.department,
    status: "active",
  }))
  const contacts = await insert("contacts", ctRows)
  console.log(`   ✓ ${contacts.length} contactos creados`)

  const ctId = contacts.map((c) => c.id)

  // Construir mapa company_index → primer contacto index para oportunidades
  // (cci en OPPS_RAW es índice absoluto en CONTACTS_RAW)
  // ctId[x] ya está en el mismo orden que CONTACTS_RAW

  // 5. Insertar oportunidades
  console.log(`\n🎯  Insertando ${OPPS_RAW.length} oportunidades...`)
  const oppRows = OPPS_RAW.map((o) => ({
    tenant_id:           tenantId,
    company_id:          coId[o.ci],
    contact_id:          ctId[o.cci],
    name:                o.name,
    business_type:       o.type,
    estimated_value:     o.value,
    probability:         o.prob,
    status:              o.status,
    expected_close_date: o.close,
    description:         o.desc,
  }))
  const opps = await insert("opportunities", oppRows)
  console.log(`   ✓ ${opps.length} oportunidades creadas`)

  // ── Resumen ────────────────────────────────────────────────────────────
  const byStatus = {}
  for (const o of OPPS_RAW) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1
  const won = OPPS_RAW.filter(o => o.status === "won").reduce((s,o)=>s+o.value, 0)
  const pipe = OPPS_RAW.filter(o => !["won","lost"].includes(o.status)).reduce((s,o)=>s+o.value, 0)

  console.log(`
✅  Seed completado para "${tenant.name}":
    Empresas:     ${companies.length}
    Contactos:    ${contacts.length}
    Oportunidades: ${opps.length}
      ${Object.entries(byStatus).map(([k,v])=>`${k}: ${v}`).join(" · ")}

    Pipeline activo:  $${(pipe/1e6).toFixed(1)}M COP
    Ingresos (Won):   $${(won/1e6).toFixed(1)}M COP

    → Abre /app/${SLUG}/dashboard para ver los KPIs
  `)
}

main().catch((e) => {
  console.error("\n✗", e.message ?? e)
  process.exit(1)
})
