"use client"

import { CheckCircle2, Download, FileUp, Loader2, X } from "lucide-react"
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
import type { ImportActionState } from "@/lib/csv/import-result"
import { missingColumns, parseCsv } from "@/lib/csv/parse"

const initialState: ImportActionState = { ok: false, error: null, result: null }

const MAX_PREVIEW_ROWS = 20

type ImportAction = (
  state: ImportActionState,
  formData: FormData,
) => Promise<ImportActionState>

export type CsvImportCardProps = {
  /** Plain-language entity label, e.g. "empresas". */
  entityPlural: string
  tenantSlug: string
  /** Required column keys (snake_case) that must exist in the upload. */
  requiredColumns: string[]
  /** Which columns to show in the preview table. */
  previewColumns: { key: string; label: string }[]
  /** Official template content + filename. */
  templateCsv: string
  templateFileName: string
  action: ImportAction
  trigger: React.ReactNode
}

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function CsvImportCard({
  entityPlural,
  tenantSlug,
  requiredColumns,
  previewColumns,
  templateCsv,
  templateFileName,
  action,
  trigger,
}: CsvImportCardProps) {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState(action, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFileName(null)
    setHeaders([])
    setRows([])
    setParseError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    setOpen(next)
  }

  function handleFile(file: File) {
    setParseError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const parsed = parseCsv(text)
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setParseError("El archivo está vacío o no tiene datos.")
        setHeaders([])
        setRows([])
        return
      }
      const missing = missingColumns(parsed.headers, requiredColumns)
      if (missing.length > 0) {
        setParseError(
          `Falta la columna obligatoria: ${missing.join(", ")}. Descarga la plantilla y úsala como base.`,
        )
      }
      setFileName(file.name)
      setHeaders(parsed.headers)
      setRows(parsed.rows)
    }
    reader.onerror = () => setParseError("No se pudo leer el archivo.")
    reader.readAsText(file)
  }

  const canImport = headers.length > 0 && rows.length > 0 && !parseError
  const result = state.result

  function downloadErrorReport() {
    if (!result || result.errors.length === 0) return
    const lines = [
      "fila,problema",
      ...result.errors.map(
        (e) => `${e.row},"${e.message.replace(/"/g, '""')}"`,
      ),
    ]
    downloadCsv(lines.join("\n"), `errores-${templateFileName}`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar {entityPlural}</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, complétala con tus datos y súbela. Te
            mostramos una vista previa antes de importar.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1 — template */}
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">1. Descarga la plantilla</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Usa exactamente estas columnas. No cambies los encabezados.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => downloadCsv(templateCsv, templateFileName)}
          >
            <Download className="size-4" />
            Descargar plantilla
          </Button>
        </div>

        {/* Step 2 — upload */}
        <div className="rounded-lg border p-3">
          <p className="text-sm font-medium">2. Sube tu archivo</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="size-4" />
              Elegir archivo CSV
            </Button>
            {fileName ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {fileName}
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Quitar archivo"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
          </div>
          {parseError ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {parseError}
            </p>
          ) : null}
        </div>

        {/* Step 3 — preview */}
        {canImport ? (
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">
              3. Vista previa{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({rows.length} fila{rows.length === 1 ? "" : "s"} en total)
              </span>
            </p>
            <div className="mt-2 max-h-56 overflow-auto rounded border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/60 text-left">
                  <tr>
                    {previewColumns.map((c) => (
                      <th key={c.key} className="px-2 py-1.5 font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.slice(0, MAX_PREVIEW_ROWS).map((row, i) => (
                    <tr key={i}>
                      {previewColumns.map((c) => {
                        const idx = headers.indexOf(c.key)
                        return (
                          <td
                            key={c.key}
                            className="px-2 py-1 text-muted-foreground"
                          >
                            {idx >= 0 ? (row[idx] ?? "") : ""}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > MAX_PREVIEW_ROWS ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Mostrando las primeras {MAX_PREVIEW_ROWS}. Se importarán todas.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Result */}
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {result ? (
          <div className="rounded-lg border bg-emerald-500/5 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Importación completada
            </p>
            <p className="mt-1 text-muted-foreground">
              {result.imported} importada{result.imported === 1 ? "" : "s"} ·{" "}
              {result.skipped} omitida{result.skipped === 1 ? "" : "s"}{" "}
              (duplicadas) · {result.errors.length} con error
            </p>
            {result.errors.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={downloadErrorReport}
              >
                <Download className="size-4" />
                Descargar filas con error
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Actions */}
        <form action={formAction} className="flex justify-end gap-2">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="headers" value={JSON.stringify(headers)} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          {result ? (
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cerrar
              </Button>
            </DialogClose>
          ) : (
            <Button type="submit" disabled={!canImport || pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Importar {entityPlural}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
