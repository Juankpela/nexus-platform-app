"use server"

import {
  getPublicQuoteView,
  setQuoteStatusByPublicToken,
} from "@/modules/crm/composition"

export type PublicDecisionState = { ok: boolean; error: string | null }

/** Statuses that can no longer be decided (idempotency / final states). */
const FINAL_STATUSES = new Set(["accepted", "rejected", "expired"])

/**
 * Public, no-login decision on a quote via its token. Security is the
 * high-entropy token + strict state checks (no tenant context, service-role
 * scoped to the token). Idempotent: re-deciding a final quote is rejected.
 */
export async function decideQuoteByTokenAction(
  _state: PublicDecisionState,
  formData: FormData,
): Promise<PublicDecisionState> {
  const token = formData.get("token")
  const decision = formData.get("decision")
  if (typeof token !== "string" || !token) {
    return { ok: false, error: "Enlace inválido." }
  }
  if (decision !== "approve" && decision !== "reject") {
    return { ok: false, error: "Decisión inválida." }
  }

  try {
    const view = await getPublicQuoteView(token)
    if (!view) return { ok: false, error: "Cotización no encontrada." }
    if (FINAL_STATUSES.has(view.quote.status)) {
      return { ok: false, error: "Esta cotización ya fue decidida." }
    }

    await setQuoteStatusByPublicToken(
      token,
      decision === "approve" ? "accepted" : "rejected",
    )
  } catch {
    return { ok: false, error: "No se pudo registrar la decisión. Inténtalo de nuevo." }
  }

  return { ok: true, error: null }
}
