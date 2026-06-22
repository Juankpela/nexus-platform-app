"use server"

import { redirect } from "next/navigation"

import { ApplicationError } from "@/lib/errors/application-error"
import { endUserSession, loginUser } from "@/modules/identity/composition"

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
    await loginUser({
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
  await endUserSession()
  redirect("/login")
}
