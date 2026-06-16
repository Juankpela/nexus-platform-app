"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  QUOTE_STATUS_ACTION_LABELS,
  QUOTE_STATUS_TRANSITIONS,
  type QuoteDetail,
  type QuoteStatus,
} from "@/modules/crm/domain/quote"

type QuoteStatusControlProps = {
  quote: QuoteDetail
  onStatusChange: (status: QuoteStatus) => Promise<{ ok: boolean; error?: string | null }>
}

export function QuoteStatusControl({
  quote,
  onStatusChange,
}: QuoteStatusControlProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const transitions = QUOTE_STATUS_TRANSITIONS[quote.status]

  if (transitions.length === 0) return null

  function handleClick(status: QuoteStatus) {
    setError(null)
    startTransition(async () => {
      const result = await onStatusChange(status)
      if (!result.ok) setError(result.error ?? "Ocurrió un error.")
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {transitions.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={
            status === "rejected"
              ? "destructive"
              : status === "approved" || status === "accepted"
                ? "default"
                : "outline"
          }
          disabled={pending}
          onClick={() => handleClick(status)}
        >
          {pending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {QUOTE_STATUS_ACTION_LABELS[status] ?? status}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
