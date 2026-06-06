import { LogOut } from "lucide-react"

import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/modules/identity/presentation/actions"

export function AppHeader({
  tenantName,
  userEmail,
}: {
  tenantName: string
  userEmail: string | null
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium md:hidden">{tenantName}</p>
        <p className="hidden text-sm text-muted-foreground md:block">
          Workspace
        </p>
      </div>
      <div className="flex items-center gap-1">
        <ThemeSwitcher />
        <div className="mx-2 hidden h-5 w-px bg-border sm:block" />
        <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block">
          {userEmail}
        </span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut />
          </Button>
        </form>
      </div>
    </header>
  )
}
