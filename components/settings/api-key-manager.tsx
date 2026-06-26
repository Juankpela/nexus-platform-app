"use client"

import { Copy, KeyRound, Loader2 } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_SCOPES, KEY_PREFIXES } from "@/modules/api/domain/api-key"
import {
  issueApiKeyAction,
  type IssueApiKeyActionState,
} from "@/modules/api/presentation/api-key-actions"

const initialState: IssueApiKeyActionState = { ok: false, error: null }

const selectCls =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

const SCOPE_LABELS: Record<string, string> = {
  "materials:read": "Materiales (lectura)",
  "inventory:read": "Inventario (lectura)",
  "companies:read": "Empresas (lectura)",
  "contacts:read": "Contactos (lectura)",
  "work_orders:read": "Órdenes de trabajo (lectura)",
}

export function ApiKeyManager({ tenantSlug }: { tenantSlug: string }) {
  const [state, formAction, pending] = useActionState(
    issueApiKeyAction.bind(null, tenantSlug),
    initialState,
  )
  const [copied, setCopied] = useState(false)

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El usuario puede seleccionar y copiar manualmente si el navegador lo bloquea.
    }
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4 text-muted-foreground" />
          API keys
        </h2>
        <p className="text-sm text-muted-foreground">
          Genera claves para consumir la API pública de NEXUS (<code>/api/v1</code>).
          Los permisos son de solo lectura y se otorgan explícitamente.
        </p>
      </header>

      {state.ok && state.fullKey ? (
        <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Key creada{state.label ? ` · ${state.label}` : ""}. Cópiala ahora: no
            se vuelve a mostrar.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded border bg-background px-2 py-1.5 text-xs">
              {state.fullKey}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyKey(state.fullKey!)}
            >
              <Copy className="mr-1.5 size-3.5" />
              {copied ? "Copiada" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}

      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="label" className="text-sm font-medium">
              Etiqueta <span className="text-destructive">*</span>
            </label>
            <Input
              id="label"
              name="label"
              required
              maxLength={120}
              placeholder="Ej. Integración ERP"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="prefix" className="text-sm font-medium">
              Entorno
            </label>
            <select id="prefix" name="prefix" defaultValue="nxs_live" className={selectCls}>
              {KEY_PREFIXES.map((p) => (
                <option key={p} value={p}>
                  {p === "nxs_live" ? "Producción (nxs_live)" : "Pruebas (nxs_test)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Permisos (scopes)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {API_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="scopes" value={scope} className="size-4" />
                {SCOPE_LABELS[scope] ?? scope}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Generar API key
        </Button>
      </form>
    </section>
  )
}
