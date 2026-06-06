import { LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react"

import { FOUNDATION_PERMISSIONS } from "@/modules/authorization/domain/permission"

export type NavigationItem = {
  label: string
  segment: string
  icon: LucideIcon
  permission: string
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
]
