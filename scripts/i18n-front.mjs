// Barrido i18n del FRONT (texto visible) a español. NO toca backend/variables.
// Reemplazos literales y seguros: títulos de pestaña, locale de fechas (Node
// rinde "undefined"/"en-US" en inglés), encabezados "Status", y el "Close" del
// diálogo. Imprime cada cambio. Idempotente.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const TITLE_MAP = {
  "Sign in": "Iniciar sesión",
  Assets: "Activos",
  Asset: "Activo",
  Calendar: "Calendario",
  Cases: "Solicitudes",
  Case: "Solicitud",
  "CRM Dashboard": "Panel CRM",
  "Field Service Dashboard": "Panel de servicio de campo",
  "Service Dashboard": "Panel de servicio",
  Dispatch: "Tablero de despacho",
  Exports: "Exportaciones",
  Forecasting: "Pronóstico",
  Materials: "Materiales",
  Inventory: "Inventario",
  "Inventory movements": "Movimientos de inventario",
  Leads: "Prospectos",
  Lead: "Prospecto",
  Opportunities: "Oportunidades",
  Opportunity: "Oportunidad",
  Payments: "Pagos",
  "Price Books": "Listas de precios",
  "Price Book": "Lista de precios",
  Products: "Productos",
  Reports: "Reportes",
  Schedule: "Agenda",
  Assignment: "Asignación",
  Settings: "Configuración",
  Technicians: "Equipo técnico",
  Technician: "Técnico",
  "Work Orders": "Órdenes de trabajo",
  "Work Order": "Orden de trabajo",
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

const files = [...walk("app"), ...walk("components")]
let changes = 0
for (const f of files) {
  let src = readFileSync(f, "utf8")
  const before = src

  // 1) Títulos de pestaña: solo el patrón de metadata `{ title: "X" }`.
  for (const [en, es] of Object.entries(TITLE_MAP)) {
    src = src.split(`{ title: "${en}" }`).join(`{ title: "${es}" }`)
  }

  // 2) Locale de fechas → es-CO (undefined y en-US rinden inglés en Node).
  src = src
    .split("toLocaleDateString(undefined,").join('toLocaleDateString("es-CO",')
    .split("toLocaleString(undefined,").join('toLocaleString("es-CO",')
    .split("toLocaleTimeString(undefined,").join('toLocaleTimeString("es-CO",')
    .split("toLocaleDateString(\"en-US\",").join('toLocaleDateString("es-CO",')

  // 3) Encabezados/etiquetas de tabla en inglés → español (texto JSX exacto).
  const TEXT_MAP = {
    ">Status<": ">Estado<",
    ">When<": ">Cuándo<",
    ">Type<": ">Tipo<",
    ">Qty<": ">Cant.<",
    ">Reference<": ">Referencia<",
    ">Name<": ">Nombre<",
    ">Product<": ">Producto<",
    ">Filter<": ">Filtrar<",
    ">Missing<": ">Falta<",
    ">All types<": ">Todos los tipos<",
    ">All status<": ">Todos los estados<",
    ">All statuses<": ">Todos los estados<",
    ">Add product price<": ">Agregar precio de producto<",
    ">Edit price<": ">Editar precio<",
    ">Welcome back<": ">Bienvenido de nuevo<",
    ">Transaction history<": ">Historial de movimientos<",
    ">Recent movements<": ">Movimientos recientes<",
    'aria-label="Account settings"': 'aria-label="Configuración de cuenta"',
    'aria-label="Sign out"': 'aria-label="Cerrar sesión"',
    'aria-label="Toggle color theme"': 'aria-label="Cambiar tema"',
    'placeholder="Search by name..."': 'placeholder="Buscar por nombre..."',
    'placeholder="Search price books..."': 'placeholder="Buscar listas de precios..."',
    ">Edit price book<": ">Editar lista de precios<",
    ">Remove from price book<": ">Quitar de la lista de precios<",
    ">Clear<": ">Limpiar<",
    ">Edit product<": ">Editar producto<",
    ">Open<": ">Abiertas<",
    ">Completed<": ">Completadas<",
  }
  for (const [en, es] of Object.entries(TEXT_MAP)) src = src.split(en).join(es)

  // 4) Etiqueta accesible "Close" del diálogo → "Cerrar".
  if (f.endsWith("dialog.tsx")) src = src.split(">Close<").join(">Cerrar<")

  if (src !== before) {
    writeFileSync(f, src, "utf8")
    changes++
    console.log("✓", f.replace(/\\/g, "/"))
  }
}
console.log(`\nArchivos modificados: ${changes}`)

// Reporta cualquier título inglés restante (para revisión manual).
const remaining = []
for (const f of files) {
  const src = readFileSync(f, "utf8")
  const m = src.match(/\{ title: "([A-Za-z][^"]*)" \}/g)
  if (m) for (const x of m) if (/[A-Za-z]/.test(x) && /title: "(Sign|[A-Z][a-z]+ ?[A-Z]?[a-z]*)"/.test(x) && !/[áéíóúñ¿¡·]/.test(x)) {
    // Heurística simple: reporta títulos que parezcan inglés (sin tildes/·).
    if (!/Nexus|Plataforma|Material$/.test(x)) remaining.push(`${f.replace(/\\/g, "/")} → ${x}`)
  }
}
if (remaining.length) { console.log("\nPosibles títulos por revisar:"); remaining.forEach((r) => console.log("  •", r)) }
