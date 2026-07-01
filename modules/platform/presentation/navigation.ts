import {
  BookOpen,
  Boxes,
  Brain,
  Building2,
  CalendarClock,
  Contact,
  Cpu,
  FileDown,
  FileText,
  HardHat,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PackageSearch,
  Radio,
  Receipt,
  Route,
  Settings,
  Wallet,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import {
  BILLING_PERMISSIONS,
  CRM_PERMISSIONS,
  FORECASTING_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  NLABS_PERMISSIONS,
  SERVICE_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"

/**
 * Navegación por CAPACIDADES DEL NEGOCIO (PRODUCT-004, Commercial Readiness).
 * El cliente no debe ver "módulos técnicos": debe ver SU operación. El sidebar
 * se organiza por lo que un dueño de Field Service entiende — CRM, Operaciones,
 * Finanzas, Inteligencia, Administración — e "Inicio" (Centro Operativo) queda
 * fijo arriba como el conductor diario.
 *
 * Evoluciona la estructura de ADR-018 (Golden Path + 3 procesos) hacia las
 * capacidades comerciales, por directiva del founder. Cero cambios de dominio:
 * ninguna ruta ni permiso se elimina; solo cambia la jerarquía y el lenguaje.
 *
 * Cada capacidad se entitla con claves de `tenant_features` (reuso, sin tablas
 * nuevas): un tenant solo ve lo que compró. Ver `isCapabilityEntitled`.
 */
export type CapabilityId =
  | "home"
  | "crm"
  | "operations"
  | "finance"
  | "intelligence"
  | "admin"

export type Capability = {
  id: Exclude<CapabilityId, "home">
  /** Etiqueta comercial que ve el cliente. */
  label: string
  /** Claves de `tenant_features` que habilitan esta capacidad. */
  features: readonly string[]
  /** Capacidad núcleo que todo tenant tiene; nunca se oculta por entitlements. */
  alwaysOn?: boolean
}

/**
 * Orden y definición de las capacidades comerciales. El gating reusa la
 * infraestructura existente (`tenant_features` → `enabledFeatures`).
 * `billing`/`nlabs` aún no están sembradas como features; mientras un tenant no
 * tenga features explícitas, `isCapabilityEntitled` muestra todo (transición
 * segura, sin regresión para los tenants demo).
 */
// Las claves de `features` deben existir en el catálogo `public.features`
// (foundation, crm, sales, service, customer_portal, field_service, ai). NO usar
// claves inventadas: una capacidad mapeada a una feature inexistente nunca se
// muestra para un tenant con features configuradas. Finanzas no tiene feature
// propia ("billing" no existe): se factura/cobra lo que se vende o se atiende,
// así que se habilita con cualquier capacidad de ingresos o servicio.
export const CAPABILITIES: readonly Capability[] = [
  { id: "crm", label: "CRM", features: ["crm", "sales"] },
  { id: "operations", label: "Operaciones", features: ["service", "field_service"] },
  { id: "finance", label: "Finanzas", features: ["crm", "sales", "service", "field_service"] },
  { id: "intelligence", label: "Inteligencia", features: ["ai"] },
  { id: "admin", label: "Administración", features: [], alwaysOn: true },
] as const

const CAPABILITY_BY_ID = new Map(CAPABILITIES.map((c) => [c.id, c]))

export function capabilityLabel(id: CapabilityId): string | undefined {
  return CAPABILITY_BY_ID.get(id as Capability["id"])?.label
}

/**
 * ¿El tenant compró esta capacidad? Reglas (en orden):
 *  1. Capacidad núcleo (`alwaysOn`) → siempre visible.
 *  2. Tenant SIN capacidades comerciales configuradas → mostrar todo. Un tenant
 *     recién aprovisionado suele tener solo `foundation` habilitada; tratarlo como
 *     "sin configurar" evita que el producto se vea casi vacío (solo Inicio +
 *     Administración). El gating real ("ve solo lo que compró") aplica en cuanto
 *     se habilita al menos una capacidad comercial.
 *  3. Alguna de sus claves de feature está habilitada → visible.
 */
export function isCapabilityEntitled(
  capability: Capability,
  enabledFeatures: readonly string[],
): boolean {
  if (capability.alwaysOn) return true
  const commercial = enabledFeatures.filter((f) => f !== "foundation")
  if (commercial.length === 0) return true
  return capability.features.some((f) => enabledFeatures.includes(f))
}

export type NavigationItem = {
  label: string
  segment: string
  icon: LucideIcon
  permission: string
  capability: CapabilityId
}

export const workspaceNavigation: readonly NavigationItem[] = [
  // ── Inicio (Centro Operativo) — fijo arriba ───────────────────────────────
  { label: "Inicio", segment: "dashboard", icon: LayoutDashboard, permission: FOUNDATION_PERMISSIONS.dashboardRead, capability: "home" },

  // ── CRM (relación comercial) ──────────────────────────────────────────────
  { label: "Clientes", segment: "companies", icon: Building2, permission: CRM_PERMISSIONS.companiesRead, capability: "crm" },
  { label: "Contactos", segment: "contacts", icon: Contact, permission: CRM_PERMISSIONS.contactsRead, capability: "crm" },
  { label: "Prospectos", segment: "leads", icon: UserPlus, permission: CRM_PERMISSIONS.leadsRead, capability: "crm" },
  { label: "Oportunidades", segment: "opportunities", icon: Target, permission: CRM_PERMISSIONS.opportunitiesRead, capability: "crm" },
  { label: "Cotizaciones", segment: "quotes", icon: FileText, permission: CRM_PERMISSIONS.quotesRead, capability: "crm" },
  { label: "Productos", segment: "products", icon: Package, permission: CRM_PERMISSIONS.productsRead, capability: "crm" },
  { label: "Listas de precios", segment: "price-books", icon: BookOpen, permission: CRM_PERMISSIONS.priceBooksRead, capability: "crm" },

  // ── Operaciones (servicio en campo) ───────────────────────────────────────
  { label: "Solicitudes", segment: "cases", icon: LifeBuoy, permission: SERVICE_PERMISSIONS.casesRead, capability: "operations" },
  { label: "Órdenes de trabajo", segment: "work-orders", icon: Wrench, permission: SERVICE_PERMISSIONS.workOrdersRead, capability: "operations" },
  { label: "Agenda", segment: "schedule", icon: CalendarClock, permission: SERVICE_PERMISSIONS.schedulingRead, capability: "operations" },
  { label: "Despacho", segment: "dispatch", icon: Route, permission: SERVICE_PERMISSIONS.dispatchRead, capability: "operations" },
  { label: "Monitor de campo", segment: "field-monitor", icon: Radio, permission: SERVICE_PERMISSIONS.dispatchRead, capability: "operations" },
  { label: "Equipo técnico", segment: "technicians", icon: HardHat, permission: SERVICE_PERMISSIONS.techniciansRead, capability: "operations" },
  { label: "Catálogo de servicios", segment: "services", icon: Wrench, permission: SERVICE_PERMISSIONS.techniciansRead, capability: "operations" },
  { label: "Equipos", segment: "assets", icon: Cpu, permission: SERVICE_PERMISSIONS.assetsRead, capability: "operations" },
  { label: "Inventario", segment: "inventory", icon: Boxes, permission: INVENTORY_PERMISSIONS.stockRead, capability: "operations" },
  { label: "Materiales", segment: "inventory/materials", icon: PackageSearch, permission: INVENTORY_PERMISSIONS.materialsRead, capability: "operations" },

  // ── Finanzas (el dinero) ──────────────────────────────────────────────────
  { label: "Facturación", segment: "invoices", icon: Receipt, permission: BILLING_PERMISSIONS.invoicesRead, capability: "finance" },
  { label: "Pagos", segment: "payments", icon: Wallet, permission: BILLING_PERMISSIONS.paymentsRead, capability: "finance" },

  // ── Inteligencia (N-LABS) ─────────────────────────────────────────────────
  { label: "N-LABS", segment: "nlabs", icon: Brain, permission: NLABS_PERMISSIONS.read, capability: "intelligence" },
  { label: "Pronóstico", segment: "forecasting", icon: TrendingUp, permission: FORECASTING_PERMISSIONS.read, capability: "intelligence" },

  // ── Administración (foundation) ───────────────────────────────────────────
  { label: "Usuarios", segment: "users", icon: Users, permission: FOUNDATION_PERMISSIONS.usersRead, capability: "admin" },
  { label: "Descargas", segment: "exports", icon: FileDown, permission: FOUNDATION_PERMISSIONS.dashboardRead, capability: "admin" },
  { label: "Configuración", segment: "settings", icon: Settings, permission: FOUNDATION_PERMISSIONS.settingsRead, capability: "admin" },
] as const

/**
 * Pestañas del dashboard según permisos: Resumen (Inicio) siempre, y los paneles
 * de detalle por área que el usuario pueda ver. Reusa el gating de permisos
 * existente; no introduce navegación ni conceptos nuevos.
 */
export function dashboardTabsFor(
  tenantSlug: string,
  permissions: readonly string[],
): { label: string; href: string }[] {
  const base = `/app/${tenantSlug}/dashboard`
  const tabs = [{ label: "Resumen", href: base }]
  if (hasPermission(permissions, CRM_PERMISSIONS.opportunitiesRead))
    tabs.push({ label: "CRM", href: `${base}/crm` })
  if (hasPermission(permissions, SERVICE_PERMISSIONS.casesRead))
    tabs.push({ label: "Servicio", href: `${base}/service` })
  if (hasPermission(permissions, SERVICE_PERMISSIONS.dispatchRead))
    tabs.push({ label: "Campo", href: `${base}/field-service` })
  return tabs
}
