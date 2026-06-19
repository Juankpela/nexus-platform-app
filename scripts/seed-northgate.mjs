// Seed demo "Golden Path Northgate": siembra un escenario de coordinación de
// punta a punta para demostraciones (inversionistas). Idempotente: re-ejecutar
// no duplica nada (cada entidad se resuelve por su clave natural antes de crear).
//
// Patrón = el mismo de seed-tenant.mjs: fetch directo a la API REST de Supabase
// con el service role key (omite RLS). NO usa las use-cases del dominio (esos
// repos dependen del cliente SSR por cookies y no corren headless); por eso
// inserta directo, replicando estados, numeración (RPC) y montos. El objetivo es
// generar datos demo consistentes, no validar el dominio.
//
// Crea, sobre un tenant existente:
//   · Empresa  Northgate Medical Center  + contacto (Facility Manager)
//   · Técnico  Daniel Peláez (HVAC, senior)  + skill HVAC asignada
//   · 3 recorridos:
//       1) Caso ABIERTO (sin asignar)
//       2) Caso EN EJECUCIÓN (asignado, WO in_progress, execution working)
//       3) Caso COMPLETADO → FACTURADO → PAGADO (factura con monto real)
//
// Uso:
//   node scripts/seed-northgate.mjs [tenantSlug]
//   (tenantSlug por defecto: huella-global)

import { readFileSync } from "node:fs"

// ── Cargar .env.local ────────────────────────────────────────────────────────
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
      // last-wins: .env.local tiene bloques duplicados; el último puebla la clave
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
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  )
  process.exit(1)
}

const tenantSlug = (process.argv[2] ?? "huella-global").toLowerCase()

const baseHeaders = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...baseHeaders, ...options.headers },
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${text}`)
  }
  return body
}

/** SELECT con filtros PostgREST. Devuelve la primera fila o null. */
async function selectOne(table, filters, cols = "*") {
  const qs = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join("&")
  const rows = await req(
    `${SUPABASE_URL}/rest/v1/${table}?${qs}&select=${cols}&limit=1`,
  )
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

/** INSERT y devuelve la fila creada. */
async function insert(table, row, returnCols = "*") {
  const data = await req(
    `${SUPABASE_URL}/rest/v1/${table}?select=${returnCols}`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    },
  )
  return Array.isArray(data) ? data[0] : data
}

/** PATCH (update) por filtros. */
async function update(table, filters, patch) {
  const qs = Object.entries(filters)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`)
    .join("&")
  await req(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  })
}

/** Resuelve por clave natural o crea. Devuelve { row, created }. */
async function getOrCreate(table, match, row, cols = "*") {
  const existing = await selectOne(table, match, cols)
  if (existing) return { row: existing, created: false }
  const created = await insert(table, { ...match, ...row }, cols)
  return { row: created, created: true }
}

/** Llama un RPC de numeración consecutiva (next_*_number). */
async function nextNumber(fn, tenantId) {
  const out = await req(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify({ p_tenant_id: tenantId }),
  })
  return out // text plano
}

/**
 * Inserta una fila con número consecutivo, reintentando si la secuencia del RPC
 * va por detrás de los registros reales (colisión 23505 en el número único).
 * Cada llamada al RPC avanza la secuencia, así que eventualmente supera el máximo.
 */
async function insertWithNumber(table, baseRow, numberField, numberFn, tenantId, returnCols = "*") {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const num = await nextNumber(numberFn, tenantId)
    try {
      return await insert(table, { ...baseRow, [numberField]: num }, returnCols)
    } catch (e) {
      if (String(e.message).includes("23505") && attempt < 49) continue
      throw e
    }
  }
  throw new Error(`No pude generar un ${numberField} libre para ${table}`)
}

/** Inserta un evento de auditoría de sistema (actor_type system, actor_id null). */
async function auditSystem(tenantId, eventType, action, subjectType, subjectId, metadata) {
  await insert(
    "audit_events",
    {
      tenant_id: tenantId,
      event_type: eventType,
      action,
      actor_type: "system",
      actor_id: null,
      subject_type: subjectType,
      subject_id: subjectId,
      source: "system",
      metadata: metadata ?? {},
    },
    "id",
  )
}

// ── Fechas relativas ─────────────────────────────────────────────────────────
const now = new Date()
function iso(date) {
  return date.toISOString()
}
function atHour(daysOffset, h, m = 0) {
  const d = new Date(now)
  d.setDate(d.getDate() + daysOffset)
  d.setHours(h, m, 0, 0)
  return iso(d)
}
const todayDate = iso(now).slice(0, 10) // YYYY-MM-DD

// ── Datos demo (marcadores de subject para idempotencia) ─────────────────────
const SUBJECTS = {
  open: "HVAC sin enfriamiento — Recepción principal",
  inProgress: "HVAC sin enfriamiento — Quirófano 3",
  completed: "HVAC sin enfriamiento — Sala de servidores",
}

async function main() {
  console.log(`Sembrando escenario Northgate en tenant "${tenantSlug}"...\n`)

  // 0) Tenant
  const tenant = await selectOne("tenants", { slug: tenantSlug }, "id,name")
  if (!tenant) {
    console.error(
      `No existe el tenant "${tenantSlug}". Corre primero:\n` +
        `  node scripts/seed-tenant.mjs <email> ${tenantSlug} "Nombre"`,
    )
    process.exit(1)
  }
  const tenantId = tenant.id
  console.log(`  tenant: ${tenantId} (${tenant.name})`)

  // 1) Empresa + contacto
  const { row: company, created: companyNew } = await getOrCreate(
    "companies",
    { tenant_id: tenantId, name: "Northgate Medical Center" },
    {
      industry: "Salud",
      city: "Bogotá",
      country: "Colombia",
      status: "active",
    },
    "id,name",
  )
  console.log(`  empresa: ${company.id}${companyNew ? " (creada)" : ""}`)

  const { row: contact } = await getOrCreate(
    "contacts",
    { tenant_id: tenantId, first_name: "María", last_name: "Restrepo" },
    {
      company_id: company.id,
      title: "Facility Manager",
      email: "facility@northgatemedical.demo",
      phone: "+57 300 000 0000",
      status: "active",
    },
    "id",
  )
  console.log(`  contacto: ${contact.id} (Facility Manager)`)

  // 2) Técnico HVAC + skill
  const { row: tech } = await getOrCreate(
    "technicians",
    { tenant_id: tenantId, email: "daniel.pelaez@northgate.demo" },
    {
      first_name: "Daniel",
      last_name: "Peláez",
      phone: "+57 301 111 1111",
      status: "active",
    },
    "id",
  )
  console.log(`  técnico: ${tech.id} (Daniel Peláez)`)

  const { row: skill } = await getOrCreate(
    "skills",
    { tenant_id: tenantId, name: "HVAC" },
    {},
    "id",
  )
  await getOrCreate(
    "technician_skills",
    { tenant_id: tenantId, technician_id: tech.id, skill_id: skill.id },
    { level: "senior" },
    "tenant_id",
  )
  console.log(`  skill: HVAC (senior) asignada`)

  // Helper: crea un caso con número consecutivo, idempotente por subject.
  async function ensureCase(subject, { status, priority, description }) {
    const existing = await selectOne(
      "cases",
      { tenant_id: tenantId, subject },
      "id,case_number,work_order_id,status",
    )
    if (existing) return { row: existing, created: false }
    const row = await insertWithNumber(
      "cases",
      {
        tenant_id: tenantId,
        subject,
        description,
        status,
        priority,
        origin: "web",
        company_id: company.id,
        contact_id: contact.id,
        reporter_email: "facility@northgatemedical.demo",
      },
      "case_number",
      "next_case_number",
      tenantId,
      "id,case_number,work_order_id,status",
    )
    return { row, created: true }
  }

  // Helper: crea WO con número consecutivo, idempotente por (case_id).
  async function ensureWorkOrder(caseId, data) {
    const existing = await selectOne(
      "work_orders",
      { tenant_id: tenantId, case_id: caseId },
      "id,work_order_number,status,billable,billing_approved_at,company_id,labor_hours",
    )
    if (existing) return { row: existing, created: false }
    const row = await insertWithNumber(
      "work_orders",
      {
        tenant_id: tenantId,
        case_id: caseId,
        company_id: company.id,
        ...data,
      },
      "work_order_number",
      "next_work_order_number",
      tenantId,
      "id,work_order_number,status,billable,billing_approved_at,company_id,labor_hours",
    )
    return { row, created: true }
  }

  // Helper: asignación idempotente por (work_order_id).
  async function ensureAssignment(workOrderId, data) {
    const existing = await selectOne(
      "work_order_assignments",
      { tenant_id: tenantId, work_order_id: workOrderId },
      "id",
    )
    if (existing) return { row: existing, created: false }
    const row = await insert(
      "work_order_assignments",
      {
        tenant_id: tenantId,
        work_order_id: workOrderId,
        technician_id: tech.id,
        ...data,
      },
      "id",
    )
    return { row, created: true }
  }

  // Helper: execution idempotente por (assignment_id).
  async function ensureExecution(assignmentId, workOrderId, data) {
    const existing = await selectOne(
      "work_order_executions",
      { tenant_id: tenantId, assignment_id: assignmentId },
      "id,status",
    )
    if (existing) return { row: existing, created: false }
    const row = await insert(
      "work_order_executions",
      {
        tenant_id: tenantId,
        assignment_id: assignmentId,
        work_order_id: workOrderId,
        technician_id: tech.id,
        ...data,
      },
      "id,status",
    )
    return { row, created: true }
  }

  // ── Recorrido 1: CASO ABIERTO (sin asignar) ────────────────────────────────
  const { row: c1, created: c1New } = await ensureCase(SUBJECTS.open, {
    status: "new",
    priority: "high",
    description:
      "El aire acondicionado de la recepción principal no enfría. Reportado por el Facility Manager.",
  })
  console.log(`\n  [1] Caso ABIERTO: ${c1.case_number}${c1New ? " (creado)" : ""}`)
  if (c1New) {
    await auditSystem(tenantId, "service.case.created", "case.created", "case", c1.id, {
      subject: SUBJECTS.open,
    })
  }

  // ── Recorrido 2: CASO EN EJECUCIÓN ─────────────────────────────────────────
  const { row: c2, created: c2New } = await ensureCase(SUBJECTS.inProgress, {
    status: "working",
    priority: "critical",
    description:
      "Sin enfriamiento en el Quirófano 3. Crítico. Técnico en sitio trabajando.",
  })
  const { row: wo2, created: wo2New } = await ensureWorkOrder(c2.id, {
    subject: SUBJECTS.inProgress,
    description: "Diagnóstico y reparación de unidad HVAC — Quirófano 3.",
    priority: "critical",
    status: "in_progress",
    scheduled_start: atHour(0, 9),
    scheduled_end: atHour(0, 12),
    labor_hours: null,
  })
  if (wo2New) {
    await update("cases", { tenant_id: tenantId, id: c2.id }, { work_order_id: wo2.id })
  }
  const { row: asg2 } = await ensureAssignment(wo2.id, {
    scheduled_start: atHour(0, 9),
    scheduled_end: atHour(0, 12),
    estimated_duration_minutes: 180,
    status: "in_progress",
  })
  await ensureExecution(asg2.id, wo2.id, {
    status: "working",
    accepted_at: atHour(0, 8, 30),
    arrived_at: atHour(0, 9, 5),
    started_at: atHour(0, 9, 20),
  })
  console.log(
    `  [2] Caso EN EJECUCIÓN: ${c2.case_number} · ${wo2.work_order_number} (working)`,
  )
  if (wo2New) {
    await auditSystem(tenantId, "service.work_order.created", "work_order.created", "work_order", wo2.id, {
      workOrderNumber: wo2.work_order_number,
    })
  }

  // ── Recorrido 3: COMPLETADO → FACTURADO → PAGADO ───────────────────────────
  const LABOR_HOURS = 4
  const LABOR_RATE = 280000 // COP/h
  const PART_DESC = "Compresor de repuesto — unidad HVAC"
  const PART_TOTAL = 730000 // COP
  const laborTotal = LABOR_HOURS * LABOR_RATE
  const invoiceTotal = laborTotal + PART_TOTAL // 1.850.000 COP

  const { row: c3 } = await ensureCase(SUBJECTS.completed, {
    status: "closed",
    priority: "high",
    description:
      "Falla de enfriamiento en la sala de servidores. Atendido y resuelto.",
  })
  const { row: wo3, created: wo3New } = await ensureWorkOrder(c3.id, {
    subject: SUBJECTS.completed,
    description: "Reemplazo de compresor y restablecimiento de HVAC — sala de servidores.",
    priority: "high",
    status: "completed",
    scheduled_start: atHour(-1, 9),
    scheduled_end: atHour(-1, 12),
    actual_start: atHour(-1, 9, 10),
    actual_end: atHour(-1, 11, 30),
    labor_hours: LABOR_HOURS,
    billable: true,
    billing_approved_at: atHour(-1, 12),
    resolution_summary: "Compresor reemplazado; temperatura restablecida a 18°C.",
    completion_notes: "Cliente confirmó enfriamiento correcto.",
  })
  if (wo3New) {
    await update("cases", { tenant_id: tenantId, id: c3.id }, { work_order_id: wo3.id })
  }
  const { row: asg3 } = await ensureAssignment(wo3.id, {
    scheduled_start: atHour(-1, 9),
    scheduled_end: atHour(-1, 12),
    estimated_duration_minutes: 180,
    status: "completed",
  })
  await ensureExecution(asg3.id, wo3.id, {
    status: "completed",
    accepted_at: atHour(-1, 8, 30),
    arrived_at: atHour(-1, 9, 5),
    started_at: atHour(-1, 9, 10),
    completed_at: atHour(-1, 11, 30),
    resolution_notes: "Compresor reemplazado; sistema operando en rango.",
  })

  // Factura (idempotente por work_order_id, status != void)
  let invoice = await selectOne(
    "invoices",
    { tenant_id: tenantId, work_order_id: wo3.id },
    "id,status,invoice_number",
  )
  let invoiceNew = false
  if (!invoice || invoice.status === "void") {
    invoice = await insertWithNumber(
      "invoices",
      {
        tenant_id: tenantId,
        origin_type: "work_order",
        work_order_id: wo3.id,
        company_id: company.id,
        contact_id: contact.id,
        status: "paid", // pagada (saldo 0) — sin trigger, lo fijamos aquí
        currency: "COP",
        subtotal: invoiceTotal,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: invoiceTotal,
        amount_paid: invoiceTotal,
        issue_date: todayDate,
        payment_terms: "Contado",
      },
      "invoice_number",
      "next_invoice_number",
      tenantId,
      "id,status,invoice_number",
    )
    invoiceNew = true
    // Líneas
    await insert("invoice_lines", [
      {
        tenant_id: tenantId,
        invoice_id: invoice.id,
        description: "Mano de obra HVAC",
        quantity: LABOR_HOURS,
        unit_price: LABOR_RATE,
        discount_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        line_total: laborTotal,
        sort_order: 0,
      },
      {
        tenant_id: tenantId,
        invoice_id: invoice.id,
        description: PART_DESC,
        quantity: 1,
        unit_price: PART_TOTAL,
        discount_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        line_total: PART_TOTAL,
        sort_order: 1,
      },
    ])
  }

  // Pago + asignación (idempotente: solo si la factura recién se creó)
  if (invoiceNew) {
    const payment = await insertWithNumber(
      "payments",
      {
        tenant_id: tenantId,
        company_id: company.id,
        amount: invoiceTotal,
        method: "transfer",
        payment_date: todayDate,
        reference: "Transferencia PSE",
        status: "recorded",
      },
      "payment_number",
      "next_payment_number",
      tenantId,
      "id",
    )
    await insert("payment_allocations", {
      tenant_id: tenantId,
      payment_id: payment.id,
      invoice_id: invoice.id,
      amount: invoiceTotal,
    })
    await auditSystem(tenantId, "billing.invoice.paid", "invoice.paid", "invoice", invoice.id, {
      invoiceNumber: invoice.invoice_number,
      amount: invoiceTotal,
    })
  }

  console.log(
    `  [3] Caso COMPLETADO: ${c3.case_number} · ${wo3.work_order_number} · ` +
      `${invoice.invoice_number} (${invoice.status}) · $${invoiceTotal.toLocaleString("es-CO")} COP`,
  )

  console.log(`\n✓ Escenario Northgate listo en "${tenantSlug}".`)
  console.log(
    `  Recorridos: 1 abierto · 1 en ejecución · 1 completado/facturado/pagado`,
  )
  console.log(
    `  Nota: "Por cobrar" = $0 (la factura del recorrido 3 está pagada). ` +
      `Para un saldo pendiente, pídeme la variante de pago parcial.`,
  )
}

main().catch((error) => {
  console.error("\n✗ Error en el seed:", error.message ?? error)
  process.exit(1)
})
