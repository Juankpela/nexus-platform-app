import {
  BarChart3,
  BookOpen,
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
  Receipt,
  Settings,
  Target,
  TrendingUp,
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
  "CRM",
  "Service",
  "Field Service",
  "Revenue",
  "Inventory",
  "Analytics",
  "Administration",
] as const

export type NavigationGroup = (typeof NAVIGATION_GROUP_ORDER)[number]

export const workspaceNavigation: NavigationItem[] = [
  // ── Dashboard (ungrouped, always first) ───────────────────────────────────
  {
    label: "Dashboard",
    segment: "dashboard",
    icon: LayoutDashboard,
    permission: FOUNDATION_PERMISSIONS.dashboardRead,
  },

  // ── CRM ────────────────────────────────────────────────────────────────────
  { label: "Companies", segment: "companies", icon: Building2, permission: CRM_PERMISSIONS.companiesRead, group: "CRM" },
  { label: "Contacts", segment: "contacts", icon: Contact, permission: CRM_PERMISSIONS.contactsRead, group: "CRM" },
  { label: "Opportunities", segment: "opportunities", icon: Target, permission: CRM_PERMISSIONS.opportunitiesRead, group: "CRM" },
  { label: "Products", segment: "products", icon: Package, permission: CRM_PERMISSIONS.productsRead, group: "CRM" },
  { label: "Price Books", segment: "price-books", icon: BookOpen, permission: CRM_PERMISSIONS.priceBooksRead, group: "CRM" },
  { label: "Quotes", segment: "quotes", icon: FileText, permission: CRM_PERMISSIONS.quotesRead, group: "CRM" },

  // ── Service ──────────────────────────────────────────────────────────────
  { label: "Cases", segment: "cases", icon: LifeBuoy, permission: SERVICE_PERMISSIONS.casesRead, group: "Service" },
  { label: "Assets", segment: "assets", icon: Cpu, permission: SERVICE_PERMISSIONS.assetsRead, group: "Service" },

  // ── Field Service ──────────────────────────────────────────────────────────
  { label: "Work Orders", segment: "work-orders", icon: Wrench, permission: SERVICE_PERMISSIONS.workOrdersRead, group: "Field Service" },
  { label: "Technicians", segment: "technicians", icon: HardHat, permission: SERVICE_PERMISSIONS.techniciansRead, group: "Field Service" },
  { label: "Schedule", segment: "schedule", icon: CalendarClock, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Field Service" },
  { label: "Dispatch", segment: "dispatch", icon: Radar, permission: SERVICE_PERMISSIONS.dispatchRead, group: "Field Service" },
  { label: "Calendar", segment: "calendar", icon: CalendarDays, permission: SERVICE_PERMISSIONS.schedulingRead, group: "Field Service" },

  // ── Revenue ──────────────────────────────────────────────────────────────
  { label: "Invoices", segment: "invoices", icon: Receipt, permission: BILLING_PERMISSIONS.invoicesRead, group: "Revenue" },

  // ── Inventory ──────────────────────────────────────────────────────────────
  { label: "Inventory", segment: "inventory", icon: Boxes, permission: INVENTORY_PERMISSIONS.stockRead, group: "Inventory" },
  { label: "Materials", segment: "inventory/materials", icon: PackageSearch, permission: INVENTORY_PERMISSIONS.materialsRead, group: "Inventory" },

  // ── Analytics ──────────────────────────────────────────────────────────────
  { label: "Forecast", segment: "forecasting", icon: TrendingUp, permission: FORECASTING_PERMISSIONS.read, group: "Analytics" },
  { label: "Reports", segment: "reports", icon: BarChart3, permission: FORECASTING_PERMISSIONS.read, group: "Analytics" },

  // ── Administration ─────────────────────────────────────────────────────────
  { label: "Exports", segment: "exports", icon: FileDown, permission: FOUNDATION_PERMISSIONS.dashboardRead, group: "Administration" },
  { label: "Users", segment: "users", icon: Users, permission: FOUNDATION_PERMISSIONS.usersRead, group: "Administration" },
  { label: "Settings", segment: "settings", icon: Settings, permission: FOUNDATION_PERMISSIONS.settingsRead, group: "Administration" },
]
