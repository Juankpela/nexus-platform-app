import {
  BookOpen,
  Building2,
  Contact,
  Cpu,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Package,
  HardHat,
  Wrench,
  Settings,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  CRM_PERMISSIONS,
  FORECASTING_PERMISSIONS,
  FOUNDATION_PERMISSIONS,
  SERVICE_PERMISSIONS,
} from "@/modules/authorization/domain/permission"

export type NavigationItem = {
  label: string
  segment: string
  icon: LucideIcon
  permission: string
  /** Optional sidebar group heading. Ungrouped items render first. */
  group?: string
}

export const workspaceNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    segment: "dashboard",
    icon: LayoutDashboard,
    permission: FOUNDATION_PERMISSIONS.dashboardRead,
  },
  {
    label: "Users",
    segment: "users",
    icon: Users,
    permission: FOUNDATION_PERMISSIONS.usersRead,
  },
  {
    label: "Settings",
    segment: "settings",
    icon: Settings,
    permission: FOUNDATION_PERMISSIONS.settingsRead,
  },
  {
    label: "Companies",
    segment: "companies",
    icon: Building2,
    permission: CRM_PERMISSIONS.companiesRead,
    group: "CRM",
  },
  {
    label: "Contacts",
    segment: "contacts",
    icon: Contact,
    permission: CRM_PERMISSIONS.contactsRead,
    group: "CRM",
  },
  {
    label: "Opportunities",
    segment: "opportunities",
    icon: Target,
    permission: CRM_PERMISSIONS.opportunitiesRead,
    group: "CRM",
  },
  {
    label: "Products",
    segment: "products",
    icon: Package,
    permission: CRM_PERMISSIONS.productsRead,
    group: "CRM",
  },
  {
    label: "Price Books",
    segment: "price-books",
    icon: BookOpen,
    permission: CRM_PERMISSIONS.priceBooksRead,
    group: "CRM",
  },
  {
    label: "Quotes",
    segment: "quotes",
    icon: FileText,
    permission: CRM_PERMISSIONS.quotesRead,
    group: "CRM",
  },
  {
    label: "Assets",
    segment: "assets",
    icon: Cpu,
    permission: SERVICE_PERMISSIONS.assetsRead,
    group: "Operaciones",
  },
  {
    label: "Cases",
    segment: "cases",
    icon: LifeBuoy,
    permission: SERVICE_PERMISSIONS.casesRead,
    group: "Operaciones",
  },
  {
    label: "Work Orders",
    segment: "work-orders",
    icon: Wrench,
    permission: SERVICE_PERMISSIONS.workOrdersRead,
    group: "Operaciones",
  },
  {
    label: "Technicians",
    segment: "technicians",
    icon: HardHat,
    permission: SERVICE_PERMISSIONS.techniciansRead,
    group: "Operaciones",
  },
  {
    label: "Forecasting",
    segment: "forecasting",
    icon: TrendingUp,
    permission: FORECASTING_PERMISSIONS.read,
    group: "Analytics",
  },
]
