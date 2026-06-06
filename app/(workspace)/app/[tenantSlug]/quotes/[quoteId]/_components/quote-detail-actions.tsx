"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Edit, GitBranch, Loader2, Plus, Trash2 } from "lucide-react"

import { QuoteFormDialog } from "@/components/crm/quote-form-dialog"
import { QuoteLineForm } from "@/components/crm/quote-line-form"
import { QuoteStatusControl } from "@/components/crm/quote-status-control"
import { Button } from "@/components/ui/button"
import type {
  OpportunityOption,
  PriceBookOption,
  ProductLineOption,
  QuoteDetail,
  QuoteLine,
  QuoteStatus,
} from "@/modules/crm/domain/quote"
import {
  addQuoteLineAction,
  changeQuoteStatusAction,
  createQuoteRevisionAction,
  removeQuoteLineAction,
  updateQuoteAction,
  updateQuoteLineAction,
} from "@/modules/crm/presentation/quote-actions"

type CompanyOption = { id: string; name: string }
type ContactOption = { id: string; name: string }

type QuoteDetailActionsProps = {
  tenantSlug: string
  quote: QuoteDetail
  lines: QuoteLine[]
  products: ProductLineOption[]
  companies: CompanyOption[]
  contacts: ContactOption[]
  opportunities: OpportunityOption[]
  priceBooks: PriceBookOption[]
}

export function QuoteDetailActions({
  tenantSlug,
  quote,
  lines,
  products,
  companies,
  contacts,
  opportunities,
  priceBooks,
}: QuoteDetailActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [addLineOpen, setAddLineOpen] = useState(false)
  const [editLine, setEditLine] = useState<QuoteLine | null>(null)
  const [revisionPending, startRevision] = useTransition()
  const [removePending, startRemove] = useTransition()

  const isEditable = quote.status === "draft" || quote.status === "approved"

  async function handleStatusChange(status: QuoteStatus) {
    const result = await changeQuoteStatusAction(tenantSlug, quote.id, status)
    if (result.ok) router.refresh()
    return result
  }

  function handleRevision() {
    startRevision(async () => {
      const result = await createQuoteRevisionAction(tenantSlug, quote.id)
      if (result.ok && result.data) {
        router.push(`/app/${tenantSlug}/quotes/${result.data.id}`)
      }
    })
  }

  function handleRemoveLine(lineId: string) {
    startRemove(async () => {
      await removeQuoteLineAction(tenantSlug, quote.id, lineId)
      router.refresh()
    })
  }

  const boundUpdateQuote = updateQuoteAction.bind(null, tenantSlug, quote.id)
  const boundAddLine = addQuoteLineAction.bind(null, tenantSlug, quote.id)

  return (
    <div className="space-y-4">
      {/* Status transitions + edit + revision */}
      <div className="flex flex-wrap items-center gap-2">
        <QuoteStatusControl quote={quote} onStatusChange={handleStatusChange} />

        {isEditable && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={handleRevision}
          disabled={revisionPending}
        >
          {revisionPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitBranch className="mr-2 h-4 w-4" />
          )}
          New Revision
        </Button>
      </div>

      {/* Add line button */}
      {isEditable && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddLineOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Line
        </Button>
      )}

      {/* Per-line edit/remove — only shown when editable */}
      {isEditable && lines.length > 0 && (
        <div className="rounded-md border divide-y text-sm">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between px-4 py-2"
            >
              <span className="font-medium">{l.productName}</span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditLine(l)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={removePending}
                  onClick={() => handleRemoveLine(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit quote dialog */}
      <QuoteFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          setEditOpen(false)
          router.refresh()
        }}
        tenantSlug={tenantSlug}
        defaultValues={quote}
        action={boundUpdateQuote}
        title="Edit Quote"
        companies={companies}
        contacts={contacts}
        opportunities={opportunities}
        priceBooks={priceBooks}
      />

      {/* Add line dialog */}
      <QuoteLineForm
        open={addLineOpen}
        onOpenChange={setAddLineOpen}
        onSuccess={() => {
          setAddLineOpen(false)
          router.refresh()
        }}
        action={boundAddLine}
        products={products}
        title="Add Line Item"
        sortOrder={lines.length}
      />

      {/* Edit line dialog */}
      {editLine && (
        <QuoteLineForm
          open
          onOpenChange={(open) => {
            if (!open) setEditLine(null)
          }}
          onSuccess={() => {
            setEditLine(null)
            router.refresh()
          }}
          action={updateQuoteLineAction.bind(
            null,
            tenantSlug,
            quote.id,
            editLine.id,
          )}
          products={products}
          defaultValues={editLine}
          title="Edit Line Item"
        />
      )}
    </div>
  )
}
