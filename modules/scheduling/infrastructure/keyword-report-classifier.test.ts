import { describe, expect, it } from "vitest"

import { KeywordReportClassifier } from "./keyword-report-classifier"

// UNA sola instancia para los tres tenants: demuestra que el motor es
// tenant-agnóstico (sin categorías globales, sin cambiar código).
const classifier = new KeywordReportClassifier()

const TENANT_A = [
  { id: "a-hvac-senior", name: "HVAC Senior" },
  { id: "a-hvac-junior", name: "HVAC Junior" },
  { id: "a-refri", name: "Refrigeración" },
]
const TENANT_B = [
  { id: "b-asc", name: "Ascensores" },
  { id: "b-elec", name: "Electrónica Industrial" },
]
const TENANT_C = [
  { id: "c-panel", name: "Paneles Solares" },
  { id: "c-inv", name: "Inversores" },
  { id: "c-redes", name: "Redes Eléctricas" },
]

const classify = (text: string, skills: { id: string; name: string }[]) =>
  classifier.classify({ tenantId: "t", text, availableSkills: skills })

describe("KeywordReportClassifier — tenant-aware, sin categorías globales", () => {
  it("Tenant A: 'cámara de refrigeración' → skill real Refrigeración", async () => {
    const r = await classify("La cámara de refrigeración no enfría.", TENANT_A)
    expect(r.skillId).toBe("a-refri")
    expect(r.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it("Tenant A: 'HVAC' ambiguo (Senior vs Junior) → ESCALATE (empate)", async () => {
    const r = await classify("Se dañó el HVAC del tercer piso.", TENANT_A)
    expect(r.skillId).toBeNull()
    expect(r.confidence).toBe(0)
  })

  it("Tenant B: 'ascensor detenido' → skill real Ascensores", async () => {
    const r = await classify("El ascensor principal está detenido.", TENANT_B)
    expect(r.skillId).toBe("b-asc")
  })

  it("Tenant B: 'electrónica del ascensor' → ESCALATE (dos skills candidatas)", async () => {
    const r = await classify("Falla electrónica en el ascensor.", TENANT_B)
    expect(r.skillId).toBeNull()
  })

  it("Tenant C: 'paneles solares' → skill real Paneles Solares", async () => {
    const r = await classify("Instalación de paneles solares en la azotea.", TENANT_C)
    expect(r.skillId).toBe("c-panel")
  })

  it("Tenant C: 'inversor no enciende' → skill real Inversores", async () => {
    const r = await classify("El inversor no enciende desde ayer.", TENANT_C)
    expect(r.skillId).toBe("c-inv")
  })

  it("Tenant C: 'red eléctrica' → skill real Redes Eléctricas", async () => {
    const r = await classify("Problema en la red eléctrica del tablero.", TENANT_C)
    expect(r.skillId).toBe("c-redes")
  })

  it("Sin coincidencia con el catálogo → ESCALATE (preferir falso negativo)", async () => {
    const r = await classify("La puerta principal no abre.", TENANT_C)
    expect(r.skillId).toBeNull()
    expect(r.confidence).toBe(0)
  })

  it("El término de un tenant NO clasifica en otro tenant (aislamiento)", async () => {
    // 'paneles solares' no existe en el catálogo de A → ESCALATE.
    const r = await classify("Mantenimiento de paneles solares.", TENANT_A)
    expect(r.skillId).toBeNull()
  })
})

// ── Hito B: recall por vocabulario propio del tenant (aliases) ───────────────
const A_ALIAS = [
  { id: "a-elec", name: "Electricidad", aliases: ["eléctrico", "corriente", "breaker", "luz"] },
  { id: "a-plom", name: "Plomería", aliases: ["fuga", "tubería", "agua", "grifo"] },
  { id: "a-refri", name: "Refrigeración", aliases: ["nevera", "congelador", "cámara fría", "frío"] },
]
const B_ALIAS = [
  { id: "b-asc", name: "Ascensores", aliases: ["elevador", "montacargas"] },
  { id: "b-elec", name: "Electrónica Industrial", aliases: ["plc", "automatización"] },
]

describe("KeywordReportClassifier — recall con aliases del tenant", () => {
  it("'Problema eléctrico' → Electricidad vía alias (antes ESCALATE)", async () => {
    const r = await classify("Tenemos un problema eléctrico en el segundo piso.", A_ALIAS)
    expect(r.skillId).toBe("a-elec")
    expect(r.matchedTerm).toBe("eléctrico")
    expect(r.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it("'se dañó la nevera' → Refrigeración vía alias", async () => {
    const r = await classify("Se dañó la nevera del comedor.", A_ALIAS)
    expect(r.skillId).toBe("a-refri")
  })

  it("alias corto 'luz' → Electricidad (palabra exacta)", async () => {
    const r = await classify("No hay luz en la bodega.", A_ALIAS)
    expect(r.skillId).toBe("a-elec")
  })

  it("alias multi-palabra 'cámara fría' → Refrigeración", async () => {
    const r = await classify("La cámara fría no mantiene temperatura.", A_ALIAS)
    expect(r.skillId).toBe("a-refri")
  })

  it("aliases del Tenant B no contaminan al Tenant A (multi-tenant)", async () => {
    const r = await classify("El elevador está atascado.", A_ALIAS)
    expect(r.skillId).toBeNull() // 'elevador' es alias de B, no de A
  })

  it("'elevador' → Ascensores en el Tenant B", async () => {
    const r = await classify("El elevador está atascado.", B_ALIAS)
    expect(r.skillId).toBe("b-asc")
  })

  it("reporte que toca dos skills del tenant → ESCALATE (ambiguo)", async () => {
    const r = await classify("Hay una fuga de agua y un problema eléctrico.", A_ALIAS)
    expect(r.skillId).toBeNull()
  })
})
