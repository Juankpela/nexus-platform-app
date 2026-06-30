// NEXUS — Instrumento de evidencia. Aplica ÚNICAMENTE la ontología congelada
// (Compromiso · Resultado · Punto de no retorno · Ventana de reversibilidad ·
//  Acción reversible · Valor económico expuesto). Sin conceptos nuevos.
//
// Experimento A — "NEXUS piensa" (mide CAPACIDAD, no mercado):
//   node scripts/nexus-piensa.mjs --demo                 # fixture A/B, auto-verifica los 5 criterios
//   node scripts/nexus-piensa.mjs --tenant huella-global # lee compromisos reales (.env.local)
//
// Experimento B — "NEXUS recupera valor" (decide la empresa; necesita historia real):
//   node scripts/nexus-piensa.mjs --backtest historia.json   # 90 días de un operador real
//   node scripts/nexus-piensa.mjs --backtest                  # fixture, prueba el instrumento
//
// Dependencias: ninguna (Node ESM puro). --tenant usa fetch + .env.local.

const MIN = 60_000
const H = 60 * MIN
const money = (n) => `$${Number(n).toLocaleString("en-US")}`
const hrs = (ms) => `${(ms / H).toFixed(1)}h`

// ── EL MOTOR: aplica la ontología a un Compromiso y devuelve su razonamiento auditable ──
// Compromiso: { id, etiqueta, plazoMs, duracionMin, recurso, recursoLibreDesdeMs, iniciado, valorExpuesto, resultado? }
function pensar(c, ahoraMs) {
  const duracionMs = (c.duracionMin ?? 0) * MIN
  // Punto de no retorno: el último instante en que aún se puede EMPEZAR y terminar a tiempo.
  // NO es el plazo: es anterior (plazo − duración del trabajo).
  const puntoDeNoRetornoMs = c.plazoMs - duracionMs
  const enVentana = ahoraMs <= puntoDeNoRetornoMs
  const ventanaRestanteMs = Math.max(0, puntoDeNoRetornoMs - ahoraMs)
  // Trayectoria con el PLAN ACTUAL: si no está iniciado, el recurso asignado lo terminaría en
  // recursoLibreDesde + duración. Si eso pasa el plazo → incumple en la trayectoria actual.
  const finProyectadoMs = c.iniciado ? ahoraMs : (c.recursoLibreDesdeMs ?? ahoraMs) + duracionMs
  const trayectoriaCumple = c.iniciado ? true : finProyectadoMs <= c.plazoMs

  let estado
  if (trayectoriaCumple) estado = "sano"
  else if (enVentana) estado = "en_riesgo_accionable" // el plan actual incumple, PERO aún hay ventana para cambiarlo
  else estado = "perdido" // ni empezando ahora se termina: ventana cerrada, no perseguir

  // Acción reversible: solo tiene sentido DENTRO de la ventana. Su contenido lo dicta la restricción que ata.
  let accionReversible = null
  let cadenaCausal = []
  if (estado === "en_riesgo_accionable") {
    accionReversible =
      `Liberar/reasignar a "${c.recurso}" antes de las ${hrs(ventanaRestanteMs)} restantes, ` +
      `o expeditar el trabajo, o renegociar el plazo con el cliente`
    cadenaCausal = [
      `Compromiso "${c.etiqueta}": plazo en ${hrs(c.plazoMs - ahoraMs)} · valor económico expuesto ${money(c.valorExpuesto)}`,
      `Requiere ${c.duracionMin} min de "${c.recurso}", que recién queda libre en ${hrs((c.recursoLibreDesdeMs ?? ahoraMs) - ahoraMs)}`,
      `Trayectoria con el plan actual → terminaría ${hrs(finProyectadoMs - c.plazoMs)} TARDE → resultado proyectado: INCUMPLIDO`,
      `Punto de no retorno = plazo − duración = en ${hrs(ventanaRestanteMs)} (ANTES del plazo). Ahora estamos dentro de la ventana`,
      `Acción reversible disponible AHORA: ${accionReversible}`,
    ]
  } else if (estado === "perdido") {
    cadenaCausal = [`Compromiso "${c.etiqueta}": ventana CERRADA (ni empezando ahora se cumple el plazo). No accionable — no perseguir.`]
  } else {
    cadenaCausal = [`Compromiso "${c.etiqueta}": en trayectoria de cumplir. Sano.`]
  }

  // Prioridad: SOLO entre accionables, por valor expuesto (y a igualdad, ventana más corta = más urgente).
  return { ...c, estado, enVentana, puntoDeNoRetornoMs, ventanaRestanteMs, trayectoriaCumple, accionReversible, cadenaCausal }
}

function priorizar(compromisos, ahoraMs) {
  const juicios = compromisos.map((c) => pensar(c, ahoraMs))
  const accionables = juicios
    .filter((j) => j.estado === "en_riesgo_accionable")
    .sort((a, b) => b.valorExpuesto - a.valorExpuesto || a.ventanaRestanteMs - b.ventanaRestanteMs)
  return { juicios, accionables }
}

// ── Salida = DECISIÓN, no tablero ──
function imprimirDecision(compromisos, ahoraMs) {
  const { juicios, accionables } = priorizar(compromisos, ahoraMs)
  const top = accionables[0]
  console.log(`\n🧠 NEXUS — evaluó ${juicios.length} compromisos.`)
  const c = juicios.reduce((a, j) => ((a[j.estado] = (a[j.estado] ?? 0) + 1), a), {})
  console.log(`   sanos: ${c.sano ?? 0} · en riesgo accionable: ${c.en_riesgo_accionable ?? 0} · perdidos (no perseguir): ${c.perdido ?? 0}\n`)
  if (!top) { console.log("   Sin compromisos accionables ahora. Tu operación está sana o lo perdido ya es irreversible.\n"); return { juicios, accionables } }
  console.log(`👉 DECISIÓN: actúa sobre "${top.etiqueta}" AHORA — es ${money(top.valorExpuesto)} en riesgo, dentro de su ventana.`)
  console.log(`   Cadena causal (auditable):`)
  top.cadenaCausal.forEach((paso, i) => console.log(`     ${i + 1}. ${paso}`))
  const segundo = accionables[1]
  if (segundo) console.log(`\n   (Mientras tanto, lo "ruidoso" suele ser "${segundo.etiqueta}" — solo ${money(segundo.valorExpuesto)}. NEXUS te apunta al de mayor valor, no al más visible.)`)
  console.log("")
  return { juicios, accionables }
}

// ── EXPERIMENTO A — fixture A/B con auto-verificación de los 5 criterios ──
function demo() {
  const T = Date.parse("2026-06-29T08:00:00Z")
  const compromisos = [
    { id: "B", etiqueta: "WO-1423 · AA Torre Empresarial Norte (cliente grande)", plazoMs: T + 50 * H, duracionMin: 240, recurso: "Carlos (único certificado)", recursoLibreDesdeMs: T + 47 * H, iniciado: false, valorExpuesto: 8000 },
    { id: "A", etiqueta: "WO-1588 · Mantenimiento menor (cliente que llama seguido)", plazoMs: T + 6 * H, duracionMin: 60, recurso: "Ana", recursoLibreDesdeMs: T + 6 * H, iniciado: false, valorExpuesto: 400 },
    { id: "S", etiqueta: "WO-1601 · Revisión programada", plazoMs: T + 30 * H, duracionMin: 120, recurso: "Beto", recursoLibreDesdeMs: T + 2 * H, iniciado: false, valorExpuesto: 2000 },
    { id: "P", etiqueta: "WO-1490 · Reparación urgente (ya vencida de hecho)", plazoMs: T + 1 * H, duracionMin: 240, recurso: "Diana", recursoLibreDesdeMs: T, iniciado: false, valorExpuesto: 5000 },
  ]
  console.log("══ EXPERIMENTO A · 'NEXUS piensa' (capacidad, no mercado) ══")
  const { juicios, accionables } = imprimirDecision(compromisos, T)
  const by = Object.fromEntries(juicios.map((j) => [j.id, j]))

  const checks = [
    ["1. Distingue la ventana (sano / accionable / perdido)", by.S.estado === "sano" && by.B.estado === "en_riesgo_accionable" && by.P.estado === "perdido"],
    ["2. Prioriza por valor expuesto, no por saliencia", accionables[0]?.id === "B" && accionables[1]?.id === "A"],
    ["3. Surfacea el 'save' no-obvio (silencioso de alto valor)", accionables[0]?.id === "B"],
    ["4. NO persigue lo ya perdido aunque valga mucho ($5000)", by.P.estado === "perdido" && !accionables.find((a) => a.id === "P")],
    ["5. Punto de no retorno ANTERIOR al plazo", juicios.filter((j) => j.duracionMin > 0).every((j) => j.puntoDeNoRetornoMs < j.plazoMs)],
  ]
  console.log("── Auto-verificación de capacidad ──")
  let ok = true
  for (const [nombre, pass] of checks) { console.log(`   ${pass ? "✅" : "❌"} ${nombre}`); ok = ok && pass }
  console.log(`\n${ok ? "✅ NEXUS PIENSA: los 5 criterios se cumplen sobre datos con forma operacional real." : "❌ FALLO de capacidad — revisar el motor."}`)
  console.log("   (Esto prueba el MECANISMO. NO prueba el mercado. La ley la decide el Experimento B sobre datos reales.)\n")
  process.exit(ok ? 0 : 1)
}

// ── EXPERIMENTO B — backtest: ¿cuánto valor era RECUPERABLE? ──
function backtest(compromisosHistoricos) {
  // Cada compromiso histórico trae su resultado real y el instante en que fue revisable
  // (revisadoMs; por defecto, 24h antes del plazo: un punto de revisión razonable).
  // CONSERVADOR Y HONESTO: solo se acredita a NEXUS el valor que HABRÍA MARCADO a tiempo
  // (estado "en_riesgo_accionable"), no todo lo que en teoría tenía ventana. Un incumplido
  // que al revisar se veía "sano" es una FALLA QUE NEXUS NO DETECTA — no se le acredita.
  const filas = compromisosHistoricos.map((c) => {
    const revisadoMs = c.revisadoMs ?? c.plazoMs - 24 * H
    return { ...pensar(c, revisadoMs), resultado: c.resultado }
  })
  const incumplidos = filas.filter((f) => f.resultado === "incumplido")
  const marcables = incumplidos.filter((f) => f.estado === "en_riesgo_accionable") // NEXUS lo habría marcado y había acción reversible
  const noDetectables = incumplidos.filter((f) => f.estado === "sano") // al revisar parecía sano → NEXUS no lo marca (su límite honesto)
  const irreversibles = incumplidos.filter((f) => f.estado === "perdido") // sin ventana al revisar → no se podía salvar
  const valorTotalPerdido = incumplidos.reduce((s, f) => s + f.valorExpuesto, 0)
  const valorRecuperable = marcables.reduce((s, f) => s + f.valorExpuesto, 0)
  const pct = valorTotalPerdido ? Math.round((100 * valorRecuperable) / valorTotalPerdido) : 0

  console.log("══ EXPERIMENTO B · 'NEXUS recupera valor' (decide la empresa) ══\n")
  console.log(`Compromisos analizados: ${filas.length} · incumplidos: ${incumplidos.length}\n`)
  console.log(`1. ¿Cuántos eran reversibles al revisarlos (NEXUS los habría marcado a tiempo)? → ${marcables.length} de ${incumplidos.length} incumplidos`)
  console.log(`2. ¿Cuántos se descubrieron demasiado tarde (marcables, pero no se actuó)? → ${marcables.length}`)
  console.log(`   (irreversibles sin ventana: ${irreversibles.length} · no detectables al revisar — límite honesto de NEXUS: ${noDetectables.length})`)
  console.log(`3. ¿Qué valor económico estaba expuesto en los incumplidos? → ${money(valorTotalPerdido)}`)
  console.log(`4. ¿Qué acción habría cambiado el resultado? (por compromiso marcable):`)
  marcables.forEach((f) => console.log(`     · "${f.etiqueta}" (${money(f.valorExpuesto)}): ${f.accionReversible}`))
  console.log(`5. ¿Cuánto valor habría podido recuperarse (conservador)? → ${money(valorRecuperable)}  (${pct}% del valor perdido)\n`)
  console.log(pct >= 40
    ? `🟢 VEREDICTO: ${pct}% del valor perdido era recuperable y NEXUS lo habría marcado a tiempo → la ley genera valor económico aquí.`
    : `🔴 VEREDICTO: solo ${pct}% era marcable-y-recuperable → el grueso se perdió por recursos/proceso o no era detectable. Aquí NEXUS es herramienta, no empresa.`)
  console.log("   (Corre esto sobre 90 días de un operador REAL y el número decide la empresa.)\n")
}

function backtestFixture() {
  const T = Date.parse("2026-06-29T08:00:00Z")
  // revisadoMs = T en todos: simula UNA revisión y verifica qué habría visto NEXUS en ese instante.
  return [
    { etiqueta: "Caso silencioso caro", revisadoMs: T, plazoMs: T + 50 * H, duracionMin: 240, recurso: "Carlos", recursoLibreDesdeMs: T + 47 * H, iniciado: false, valorExpuesto: 8000, resultado: "incumplido" }, // en_riesgo_accionable → marcable
    { etiqueta: "Caso recurso ausente", revisadoMs: T, plazoMs: T + 5 * H, duracionMin: 60, recurso: "Ana", recursoLibreDesdeMs: T + 5 * H, iniciado: false, valorExpuesto: 1200, resultado: "incumplido" }, // en_riesgo_accionable → marcable
    { etiqueta: "Caso ya irreversible", revisadoMs: T, plazoMs: T + 1 * H, duracionMin: 240, recurso: "Diana", recursoLibreDesdeMs: T, iniciado: false, valorExpuesto: 3000, resultado: "incumplido" }, // perdido → irreversible
    { etiqueta: "Caso cumplido", revisadoMs: T, plazoMs: T + 30 * H, duracionMin: 120, recurso: "Beto", recursoLibreDesdeMs: T + 1 * H, iniciado: false, valorExpuesto: 2000, resultado: "cumplido" },
  ]
}

// ── Runner en vivo sobre un tenant real (Experimento A con datos reales) ──
async function corrertenant(slug) {
  const { readFileSync } = await import("node:fs")
  const env = {}
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("="); if (eq === -1) continue
    let v = t.slice(eq + 1).trim(); if ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'")) v = v.slice(1, -1)
    env[t.slice(0, eq).trim()] = v
  }
  const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL || !KEY) { console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1) }
  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }
  const get = async (p) => { const r = await fetch(`${URL}/rest/v1/${p}`, { headers }); const x = await r.text(); if (!r.ok) throw new Error(`${r.status} ${x}`); return JSON.parse(x) }

  const tenants = await get(`tenants?slug=eq.${slug}&select=id`)
  if (!tenants.length) throw new Error(`No existe el tenant ${slug}`)
  const tid = tenants[0].id
  const wos = await get(`work_orders?tenant_id=eq.${tid}&status=not.in.(completed,cancelled)&sla_due_at=not.is.null&select=id,work_order_number,company_name,sla_due_at,status,labor_hours,assigned_technician_id&limit=200`)
  const ahora = Date.now()
  const compromisos = wos.map((w) => ({
    id: w.id,
    etiqueta: `${w.work_order_number} · ${w.company_name ?? "sin cliente"}`,
    plazoMs: Date.parse(w.sla_due_at),
    duracionMin: (w.labor_hours ?? 2) * 60,
    recurso: w.assigned_technician_id ? "técnico asignado" : "SIN ASIGNAR",
    recursoLibreDesdeMs: w.assigned_technician_id ? ahora : ahora, // aprox: sin schedule del recurso, se asume disponible ahora
    iniciado: ["in_progress", "dispatched"].includes(w.status),
    valorExpuesto: 1000, // ⚠ placeholder — enriquecer desde el quote vinculado (ver TEST_NEXUS_PIENSA.md)
  }))
  console.log(`══ EXPERIMENTO A · en vivo sobre tenant "${slug}" (${compromisos.length} compromisos con plazo) ══`)
  console.log(`⚠ valor económico expuesto = placeholder $1000 (todos iguales) hasta enriquecer desde el quote → el ranking por valor no es real aún.\n`)
  imprimirDecision(compromisos, ahora)
}

// ── CLI ──
const arg = process.argv[2]
if (arg === "--demo") demo()
else if (arg === "--backtest") {
  const file = process.argv[3]
  let datos
  if (file) { const { readFileSync } = await import("node:fs"); datos = JSON.parse(readFileSync(file, "utf8")) }
  else { console.log("(sin archivo — usando fixture para probar el instrumento)\n"); datos = backtestFixture() }
  backtest(datos)
} else if (arg === "--tenant") { await corrertenant(process.argv[3] ?? "huella-global") }
else {
  console.log("Uso:\n  --demo                      Experimento A (fixture A/B, auto-verifica capacidad)\n  --tenant <slug>             Experimento A en vivo (.env.local)\n  --backtest [historia.json]  Experimento B (decide la empresa; sin archivo usa fixture)")
}
