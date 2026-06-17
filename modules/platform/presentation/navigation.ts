import {
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarClock,
  CalendarDays,
  Contact,
  Cpu,
  FileDown,
  FileText,
  HardHat,
  LayoutDashboard,
  LifeBuoy,
  Package,
  PackageSearch,
  Radar,
  Radio,
  Receipt,
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
  SERVICE_PERMISSIONS,
} from "@/modules/authorization/domain/permission"

export type NavigationItem = {
  label: string
  segment: string
  icon: LucideIcon
  permission: string
  /** Sidebar group heading. Ungrouped items render first (e.g. Dashboard). */
  group?: string
}

/**
 * Canonical order of sidebar groups. The sidebar renders ungrouped items first,
 * then these groups in this exact order. Organized by work area (product),
 * not by object — see ADR-018.
 */
export const NAVIGATION_GROUP_ORDER = [
  "Comercial",
  "Servicio",
  "Operación de campo",
  "Facturación",
  "Inventario",
  "Analítica",
  "Administración",
] as const

export type NavigationGroup = (typeof NAVIGATION_GROUP_ORDER)[number]

export const workspaceNavigation: NavigationItem[] = [
  // ── Dashboard (ungrouped, always first) ───────────────────────────────────
  {
    label: "Panel",
    segment: "dashboard",
    icon: LayoutDashboard,
    permission: FOUNDATION_PERMISSIONS.dashboardRead,
  },

  // ── Comercial ────────────────────────────────────────────────────────────────
  { label: "Prospectos", segment: "leads", icon: UserPlus, permission: CRM_PERMISSIONS.leadsRead, group: "Comercial" },
  { label: "Clientes", segment: "companies", icon: Building2, permission: CRM_PERMISSIONS.companiesRead, group: "Comercial" },
  { label: "Contactos", segment: "contacts", icon: Contact, permission: CRM_PERMISSIONS.contactsRead, group: "Comercial" },
  { label: "Oportunidades", segment: "opportunities", icon: Target, permission: CRM_PERMISSIONS.opportunitiesRead, group: "Comercial" },
  { label: "Productos", segment: "products", icon: Package, permission: CRM_PERMISSIONS.productsRead, group: "Comercial" },
  { label: "Listas de precios", segment: "price-books", icon: BookOpen, permission: CRM_PERMISSIONS.priceBooksRead, group: "Comercial" },
  { label: "Cotizaciones", segment: "quotes", icon: FileText, permission: CRM_PERMISSIONS.quotesRead, group: "Comercial" },

  // ── Servicio ──────────────────────────────────────────────────────────────
  { label: "Casos", segment: "cases", icon: LifeBuoy, permission: SERVICE_PERMISSIONS.casesRead, group: "Servicio" },
  { label: "Activos", segment: "assets", icon: Cpu, permission: SERVICE_PERMISSIONS.assetsRead, group: "Servicio" },

  // ── Operación de campo ──────────────────────────────────────────────────────
  { label: "Órdenes de trabajo", segment: "work-orders", icon: Wrench, permission: SERVICE_PERMISSIONS.workOrdersRead, group: "Operación de campo" },
  { label: "Equipo técnico", segment: "technicians", icon: HardHat, permission: SERVICE_PERMISSIONS.techniciansRead, group: "Operación de campo" },
  { label: "Agenda", segment: "schedule", icon: CalendarClock, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Operación de campo" },
  { label: "Despacho", segment: "dispatch", icon: Radar, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Operación de campo" },
  { label: "Despacho asistido", segment: "dispatch/assisted", icon: Bot, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Operación de campo" },
  { label: "Monitor de campo", segment: "field-monitor", icon: Radio, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Operación de campo" },
  { label: "Calendario", segment: "calendar", icon: CalendarDays, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Operación de campo" },

  // ── Facturación ──────────────────────────────────────────────────────────
  { label: "Facturas", segment: "invoices", icon: Receipt, permission: BILLING_PERMISSIONS.invoicesRead, group: "Facturación" },
  { label: "Pagos", segment: "payments", icon: Wallet, permission: BILLING_PERMISSIONS.paymentsRead, group: "Facturación" },

  // ── Inventario ──────────────────────────────────────────────────────────────
  { label: "Inventario", segment: "inventory", icon: Boxes, permission: INVENTORY_PERMISSIONS.stockRead, group: "Inventario" },
  { label: "Materiales", segment: "inventory/materials", icon: PackageSearch, permission: INVENTORY_PERMISSIONS.materialsRead, group: "Inventario" },

  // ── Analítica ──────────────────────────────────────────────────────────────
  { label: "Pronóstico", segment: "forecasting", icon: TrendingUp, permission: FORECASTING_PERMISSIONS.read, group: "Analítica" },
  { label: "Reportes", segment: "reports", icon: BarChart3, permission: FORECASTING_PERMISSIONS.read, group: "Analítica" },

  // ── Administración ─────────────────────────────────────────────────────────
  { label: "Exportaciones", segment: "exports", icon: FileDown, permission: FOUNDATION_PERMISSIONS.dashboardRead, group: "Administración" },
  { label: "Usuarios", segment: "users", icon: Users, permission: FOUNDATION_PERMISSIONS.usersRead, group: "Administración" },
  { label: "Configuración", segment: "settings", icon: Settings, permission: FOUNDATION_PERMISSIONS.settingsRead, group: "Administración" },
]
