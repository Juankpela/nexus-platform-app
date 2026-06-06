"use server"

import { redirect } from "next/navigation"

import { ApplicationError } from "@/lib/errors/application-error"
import { authenticate } from "@/modules/identity/application/use-cases/authenticate"
import { endSession } from "@/modules/identity/application/use-cases/end-session"
import { SupabaseAuthRepository } from "@/modules/identity/infrastructure/supabase-auth-repository"

export type LoginActionState = {
  error: string | null
}

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/select-tenant"
  }
  return value
}

export async function loginAction(
  _state: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  try {
    await authenticate(new SupabaseAuthRepository(), {
      email: formData.get("email"),
      password: formData.get("password"),
    })
  } catch (error) {
    if (error instanceof ApplicationError || error instanceof Error) {
      return { error: "Unable to sign in with those credentials." }
    }
    return { error: "Unable to sign in." }
  }

  redirect(safeReturnPath(formData.get("next")))
}

export async function logoutAction() {
  await endSession(new SupabaseAuthRepository())
  redirect("/login")
}
