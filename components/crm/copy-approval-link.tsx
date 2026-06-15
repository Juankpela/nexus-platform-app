"use client"

import { Check, Link2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

/** Copies the public approval link to the clipboard (sharable by email/WhatsApp). */
export function CopyApprovalLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — no-op; the user can still send by email.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Link2 className="mr-2 h-4 w-4" />}
      {copied ? "Copiado" : "Copiar link de aprobación"}
    </Button>
  )
}
