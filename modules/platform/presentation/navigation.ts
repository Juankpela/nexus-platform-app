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
 * Navegación por Golden Path + 3 procesos (North Star / ADR-018). Seis ítems
 * primarios planos (sin `group`) = el lazo diario de dinero, siempre visibles;
 * el resto se organiza en los tres procesos canónicos del negocio (no en un
 * único cajón). Ninguna ruta ni permiso se elimina; solo cambia la jerarquía.
 * El sidebar renderiza primero los ítems sin grupo y luego estos grupos en orden.
 */
export const NAVIGATION_GROUP_ORDER = [
  "Ventas e ingresos",
  "Servicio y campo",
  "Negocio y datos",
] as const

export type NavigationGroup = (typeof NAVIGATION_GROUP_ORDER)[number]

export const workspaceNavigation: NavigationItem[] = [
  // ── Golden Path (primarios, planos, en orden) ─────────────────────────────
  { label: "Inicio", segment: "dashboard", icon: LayoutDashboard, permission: FOUNDATION_PERMISSIONS.dashboardRead },
  { label: "Solicitudes", segment: "cases", icon: LifeBuoy, permission: SERVICE_PERMISSIONS.casesRead },
  { label: "Coordinación", segment: "dispatch/assisted", icon: Radar, permission: SERVICE_PERMISSIONS.dispatchRead },
  { label: "Trabajo", segment: "work-orders", icon: Wrench, permission: SERVICE_PERMISSIONS.workOrdersRead },
  { label: "Facturación", segment: "invoices", icon: Receipt, permission: BILLING_PERMISSIONS.invoicesRead },
  { label: "Clientes", segment: "companies", icon: Building2, permission: CRM_PERMISSIONS.companiesRead },

  // ── Ventas e ingresos (Revenue) ───────────────────────────────────────────
  { label: "Prospectos", segment: "leads", icon: UserPlus, permission: CRM_PERMISSIONS.leadsRead, group: "Ventas e ingresos" },
  { label: "Contactos", segment: "contacts", icon: Contact, permission: CRM_PERMISSIONS.contactsRead, group: "Ventas e ingresos" },
  { label: "Oportunidades", segment: "opportunities", icon: Target, permission: CRM_PERMISSIONS.opportunitiesRead, group: "Ventas e ingresos" },
  { label: "Productos", segment: "products", icon: Package, permission: CRM_PERMISSIONS.productsRead, group: "Ventas e ingresos" },
  { label: "Listas de precios", segment: "price-books", icon: BookOpen, permission: CRM_PERMISSIONS.priceBooksRead, group: "Ventas e ingresos" },
  { label: "Cotizaciones", segment: "quotes", icon: FileText, permission: CRM_PERMISSIONS.quotesRead, group: "Ventas e ingresos" },
  { label: "Pagos", segment: "payments", icon: Wallet, permission: BILLING_PERMISSIONS.paymentsRead, group: "Ventas e ingresos" },

  // ── Servicio y campo (Service) ────────────────────────────────────────────
  { label: "Activos", segment: "assets", icon: Cpu, permission: SERVICE_PERMISSIONS.assetsRead, group: "Servicio y campo" },
  { label: "Equipo técnico", segment: "technicians", icon: HardHat, permission: SERVICE_PERMISSIONS.techniciansRead, group: "Servicio y campo" },
  { label: "Agenda", segment: "schedule", icon: CalendarClock, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Servicio y campo" },
  { label: "Calendario", segment: "calendar", icon: CalendarDays, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Servicio y campo" },
  // "Tablero" = control manual del día (asignar/reasignar/avanzar). Distinto de
  // "Coordinación" (superficie de decisión asistida, fija arriba).
  { label: "Tablero", segment: "dispatch", icon: Bot, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Servicio y campo" },
  { label: "Monitor de campo", segment: "field-monitor", icon: Radio, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Servicio y campo" },

  // ── Negocio y datos (Business Ops) ────────────────────────────────────────
  { label: "Inventario", segment: "inventory", icon: Boxes, permission: INVENTORY_PERMISSIONS.stockRead, group: "Negocio y datos" },
  { label: "Materiales", segment: "inventory/materials", icon: PackageSearch, permission: INVENTORY_PERMISSIONS.materialsRead, group: "Negocio y datos" },
  { label: "Pronóstico", segment: "forecasting", icon: TrendingUp, permission: FORECASTING_PERMISSIONS.read, group: "Negocio y datos" },
  { label: "Reportes", segment: "reports", icon: BarChart3, permission: FORECASTING_PERMISSIONS.read, group: "Negocio y datos" },
  { label: "Exportaciones", segment: "exports", icon: FileDown, permission: FOUNDATION_PERMISSIONS.dashboardRead, group: "Negocio y datos" },
  { label: "Usuarios", segment: "users", icon: Users, permission: FOUNDATION_PERMISSIONS.usersRead, group: "Negocio y datos" },
  { label: "Configuración", segment: "settings", icon: Settings, permission: FOUNDATION_PERMISSIONS.settingsRead, group: "Negocio y datos" },
]
