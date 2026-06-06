import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="mt-2 text-2xl font-semibold">Access denied</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account does not have access to this resource.
        </p>
        <Button asChild className="mt-6">
          <Link href="/select-tenant">Choose workspace</Link>
        </Button>
      </div>
    </main>
  )
}
