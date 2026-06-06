"use client"

import { Button } from "@/components/ui/button"

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6 text-center">
      <div>
        <h2 className="text-lg font-semibold">Unable to load this workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The request could not be completed. Try again.
        </p>
        <Button className="mt-5" onClick={reset}>
          Retry
        </Button>
      </div>
    </div>
  )
}
