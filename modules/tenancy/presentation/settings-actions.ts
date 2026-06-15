"use server"

import { revalidatePath } from "next/cache"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  FOUNDATION_PERMISSIONS,
  hasPermission,
} from "@/modules/authorization/domain/permission"
import { getRequestContext } from "@/modules/request-context/application/get-request-context"
import { updateTenantBusinessProfile } from "@/modules/tenancy/composition"

export type SettingsActionState = { error: string | null; ok: boolean }

function field(formData: FormData, name: string): string | null {
  const v = formData.get(name)
  if (typeof v !== "string") return null
  const t = v.trim()
  return t.length > 0 ? t : null
}

/** Updates the tenant business profile (issuer data for quotes/invoices PDFs). */
export async function updateTenantSettingsAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const tenantSlug = field(formData, "tenantSlug")
  if (!tenantSlug) return { error: "Solicitud inválida.", ok: false }

  try {
    const context = await getRequestContext(tenantSlug)
    if (!hasPermission(context.effectivePermissions, FOUNDATION_PERMISSIONS.settingsWrite)) {
      return { error: "No tienes permiso para editar la configuración.", ok: false }
    }

    await updateTenantBusinessProfile(context.tenantId, {
      legalName: field(formData, "legal_name"),
      taxId: field(formData, "tax_id"),
      phone: field(formData, "phone"),
      address: field(formData, "address"),
      email: field(formData, "email"),
    })
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") {
      return { error: "No tienes permiso para editar la configuración.", ok: false }
    }
    return { error: "No se pudo guardar. Inténtalo de nuevo.", ok: false }
  }

  revalidatePath(`/app/${tenantSlug}/settings`)
  return { error: null, ok: true }
}
