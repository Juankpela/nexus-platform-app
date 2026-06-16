"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { QuoteFormDialog } from "@/components/crm/quote-form-dialog"
import { Button } from "@/components/ui/button"
import type { OpportunityOption, PriceBookOption } from "@/modules/crm/domain/quote"
import { createQuoteAction } from "@/modules/crm/presentation/quote-actions"

type CompanyOption = { id: string; name: string }
type ContactOption = { id: string; name: string }

type QuoteCreateButtonProps = {
  tenantSlug: string
  companies: CompanyOption[]
  contacts: ContactOption[]
  opportunities: OpportunityOption[]
  priceBooks: PriceBookOption[]
}

export function QuoteCreateButton({
  tenantSlug,
  companies,
  contacts,
  opportunities,
  priceBooks,
}: QuoteCreateButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const boundAction = createQuoteAction.bind(null, tenantSlug)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nueva cotización
      </Button>
      <QuoteFormDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={(q) => {
          setOpen(false)
          router.push(`/app/${tenantSlug}/quotes/${q.id}`)
        }}
        tenantSlug={tenantSlug}
        action={boundAction}
        title="Nueva cotización"
        companies={companies}
        contacts={contacts}
        opportunities={opportunities}
        priceBooks={priceBooks}
      />
    </>
  )
}
