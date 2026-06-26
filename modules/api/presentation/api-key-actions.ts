"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import { issueApiKeyForTenant } from "@/modules/api/composition"
import {
  API_SCOPES,
  KEY_PREFIXES,
  type KeyPrefix,
} from "@/modules/api/domain/api-key"
import {
  FOUNDATION_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"

export type IssueApiKeyActionState = {
  ok: boolean
  error: string | null
  /** El secreto completo se devuelve UNA sola vez (ADR-025). */
  fullKey?: string
  label?: string
}

const Schema = z.object({
  label: z.string().min(1, "La etiqueta es obligatoria.").max(120),
  prefix: z.enum([...KEY_PREFIXES] as [string, ...string[]]),
  scopes: z.array(z.enum([...API_SCOPES] as [string, ...string[]])),
})

/**
 * Emite una API key para el tenant desde Configuración. Reutiliza el caso de uso
 * existente `issueApiKeyForTenant` (scopes deny-by-default, hash en BD, secreto
 * mostrado una sola vez). Gated por tenant.settings.write.
 */
export async function issueApiKeyAction(
  tenantSlug: string,
  _prev: IssueApiKeyActionState,
  formData: FormData,
): Promise<IssueApiKeyActionState> {
  try {
    const parsed = Schema.parse({
      label: formData.get("label"),
      prefix: formData.get("prefix"),
      scopes: formData.getAll("scopes"),
    })
    const context = await getRequestContext(tenantSlug)
    if (
      !hasPermission(
        context.effectivePermissions,
        FOUNDATION_PERMISSIONS.settingsWrite,
      )
    ) {
      throw new ApplicationError("Forbidden.", "FORBIDDEN")
    }
    const { fullKey } = await issueApiKeyForTenant({
      actorId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      prefix: parsed.prefix as KeyPrefix,
      label: parsed.label,
      scopes: parsed.scopes,
    })
    revalidatePath(`/app/${tenantSlug}/settings`)
    return { ok: true, error: null, fullKey, label: parsed.label }
  } catch (err) {
    if (err instanceof ApplicationError) return { ok: false, error: err.message }
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((i) => i.message).join(", ") }
    }
    console.error(err)
    return { ok: false, error: "No se pudo generar la API key." }
  }
}
