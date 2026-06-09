import {
  BookOpen,
  Building2,
  Contact,
  FileText,
  LayoutDashboard,
  Package,
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
    label: "Forecasting",
    segment: "forecasting",
    icon: TrendingUp,
    permission: FORECASTING_PERMISSIONS.read,
    group: "Analytics",
  },
]
