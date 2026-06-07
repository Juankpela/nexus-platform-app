"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { ApplicationError } from "@/lib/errors/application-error"
import {
  createPlatformOrganization,
  setPlatformOrganizationStatus,
} from "@/modules/platform/composition"
import { ORGANIZATION_SLUG_PATTERN } from "@/modules/platform/domain/organization"
import { requirePlatformAdmin } from "@/modules/platform/presentation/require-platform-admin"

export type PlatformActionState = { error: string | null; ok: boolean }

const fail = (message: string): PlatformActionState => ({
  error: message,
  ok: false,
})

const createSchema = z.object({
  organizationName: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(63)
    .regex(ORGANIZATION_SLUG_PATTERN, "Slug inválido (usa minúsculas y guiones)."),
  adminEmail: z.email(),
  adminFullName: z.string().trim().max(120).optional(),
  adminPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
})

const statusSchema = z.object({
  tenantId: z.uuid(),
  status: z.enum(["active", "suspended"]),
})

function describeError(error: unknown): string {
  if (error instanceof ApplicationError) {
    switch (error.code) {
      case "EMAIL_TAKEN":
        return "Ya existe un usuario con ese email."
      case "SLUG_TAKEN":
        return "Ya existe una organización con ese identificador (slug)."
      case "INVALID_SLUG":
        return "El identificador (slug) es inválido."
      case "WEAK_PASSWORD":
        return "La contraseña debe tener al menos 8 caracteres."
      case "FORBIDDEN":
        return "No tienes permisos de plataforma."
    }
  }
  return "No se pudo completar la operación."
}

export async function createOrganizationAction(
  _state: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const parsed = createSchema.safeParse({
    organizationName: formData.get("organizationName"),
    slug: formData.get("slug"),
    adminEmail: formData.get("adminEmail"),
    adminFullName: formData.get("adminFullName") || undefined,
    adminPassword: formData.get("adminPassword"),
  })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Solicitud inválida.")
  }

  try {
    await requirePlatformAdmin()
    await createPlatformOrganization({
      organizationName: parsed.data.organizationName,
      slug: parsed.data.slug,
      adminEmail: parsed.data.adminEmail,
      adminFullName: parsed.data.adminFullName ?? null,
      adminPassword: parsed.data.adminPassword,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath("/platform")
  return { error: null, ok: true }
}

export async function setOrganizationStatusAction(
  _state: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const parsed = statusSchema.safeParse({
    tenantId: formData.get("tenantId"),
    status: formData.get("status"),
  })
  if (!parsed.success) return fail("Solicitud inválida.")

  try {
    await requirePlatformAdmin()
    await setPlatformOrganizationStatus({
      tenantId: parsed.data.tenantId,
      status: parsed.data.status,
    })
  } catch (error) {
    return fail(describeError(error))
  }

  revalidatePath("/platform")
  return { error: null, ok: true }
}
