"use client"

import { FileUp, Loader2, X } from "lucide-react"
import { useActionState, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  PRODUCT_FAMILIES,
  PRODUCT_TYPES,
  type ProductImportRow,
} from "@/modules/crm/domain/product"
import {
  importProductsAction,
  type ProductImportState,
} from "@/modules/crm/presentation/product-actions"

const initialState: ProductImportState = { error: null, ok: false }

const VALID_TYPES = new Set<string>(PRODUCT_TYPES)
const VALID_FAMILIES = new Set<string>(PRODUCT_FAMILIES)

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const fields: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(cur.trim())
        cur = ""
      } else {
        cur += ch
      }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = splitLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_"),
  )
  const rows = lines.slice(1).map(splitLine)
  return { headers, rows }
}

function rowsToImport(
  headers: string[],
  rows: string[][],
): ProductImportRow[] {
  const idx = (key: string) => headers.indexOf(key)
  return rows.map((row) => {
    const get = (key: string) => {
      const i = idx(key)
      return i >= 0 && i < row.length ? row[i] || null : null
    }
    const rawType =
      get("product_type")?.toLowerCase().replace(/\s+/g, "_") ?? null
    const rawFamily =
      get("product_family")?.toLowerCase().replace(/\s+/g, "_") ?? null
    return {
      name: get("name") ?? "",
      sku: get("sku"),
      description: get("description"),
      productType:
        rawType && VALID_TYPES.has(rawType)
          ? (rawType as ProductImportRow["productType"])
          : null,
      productFamily:
        rawFamily && VALID_FAMILIES.has(rawFamily)
          ? (rawFamily as ProductImportRow["productFamily"])
          : null,
      unitOfMeasure: get("unit_of_measure") ?? get("unit of measure"),
    }
  })
}

export function ProductCsvImport({
  tenantSlug,
  trigger,
}: {
  tenantSlug: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ProductImportRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState(
    importProductsAction,
    initialState,
  )

  const fileRef = useRef<HTMLInputElement>(null)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPreview(null)
      setParseError(null)
    }
    setOpen(next)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      try {
        const { headers, rows } = parseCsv(text)
        if (!headers.includes("name")) {
          setParseError(
            'CSV must have a "Name" column. Expected columns: Name, SKU, Description, Product Type, Product Family, Unit of Measure.',
          )
          setPreview(null)
          return
        }
        const parsed = rowsToImport(headers, rows)
        if (parsed.length === 0) {
          setParseError("No data rows found in the CSV.")
          setPreview(null)
          return
        }
        setParseError(null)
        setPreview(parsed)
      } catch {
        setParseError("Could not parse the CSV file.")
        setPreview(null)
      }
    }
    reader.readAsText(file)
  }

  const rowsJson = preview ? JSON.stringify(preview) : ""
  const showSummary = state.ok && !pending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: <strong>Name</strong>,{" "}
            <strong>Product Type</strong>, <strong>Product Family</strong>{" "}
            (required), plus optional SKU, Description, Unit of Measure.
          </DialogDescription>
        </DialogHeader>

        {showSummary ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <p className="font-medium">
                Import complete — {state.imported ?? 0} product
                {(state.imported ?? 0) !== 1 ? "s" : ""} imported.
              </p>
            </div>
            {(state.rowErrors?.length ?? 0) > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {state.rowErrors!.length} row
                  {state.rowErrors!.length !== 1 ? "s" : ""} skipped:
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {state.rowErrors!.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button>Done</Button>
              </DialogClose>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="rows" value={rowsJson} />

            <div className="flex items-center gap-3">
              <label
                htmlFor="csvFile"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
              >
                <FileUp className="size-4" />
                Choose CSV file
              </label>
              <input
                ref={fileRef}
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="sr-only"
              />
              {preview ? (
                <span className="text-sm text-muted-foreground">
                  {preview.length} row{preview.length !== 1 ? "s" : ""} ready
                  to import
                </span>
              ) : null}
            </div>

            {parseError ? (
              <p className="text-sm text-destructive">{parseError}</p>
            ) : null}

            {preview && preview.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 border-b bg-muted/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Family</th>
                        <th className="px-3 py-2 font-medium">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.slice(0, 100).map((row, i) => (
                        <tr
                          key={i}
                          className={
                            !row.name || !row.productType || !row.productFamily
                              ? "bg-destructive/5"
                              : ""
                          }
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-3 py-1.5">
                            {row.name || (
                              <span className="text-destructive">Missing</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.sku ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.productType ?? (
                              <span className="text-destructive">Missing</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.productFamily ?? (
                              <span className="text-destructive">Missing</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {row.unitOfMeasure ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 100 ? (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 100 of {preview.length} rows.
                  </p>
                ) : null}
              </div>
            ) : null}

            {state.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  <X className="size-4" />
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={pending || !preview || preview.length === 0}
              >
                {pending ? <Loader2 className="animate-spin" /> : null}
                Import {preview ? preview.length : 0} row
                {(preview?.length ?? 0) !== 1 ? "s" : ""}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
