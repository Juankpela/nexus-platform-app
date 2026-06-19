import "server-only"

import { Resend } from "resend"

import { env } from "@/lib/config/env"
import { ApplicationError } from "@/lib/errors/application-error"

export type EmailAttachment = { filename: string; content: Buffer }

/**
 * Estado real de configuración de email, para que la auditoría y la operación
 * NUNCA afirmen una entrega que no ocurrirá:
 *  - "disabled": faltan credenciales → `sendEmail` lanza EMAIL_NOT_CONFIGURED.
 *  - "sandbox": remitente `@resend.dev` → Resend ACEPTA (200) pero SOLO entrega
 *    al dueño de la cuenta; los clientes reales no reciben. No detectable por la
 *    respuesta del API, solo por el remitente.
 *  - "production": remitente de dominio propio (requiere verificación + DKIM/SPF).
 */
export type EmailDeliverability = "disabled" | "sandbox" | "production"

export function emailConfigStatus(): EmailDeliverability {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return "disabled"
  // El remitente puede venir como "Nombre <correo@dominio>" o "correo@dominio".
  const addr = /<([^>]+)>/.exec(env.EMAIL_FROM)?.[1] ?? env.EMAIL_FROM
  return /@resend\.dev\s*$/i.test(addr) ? "sandbox" : "production"
}

export type SendEmailInput = {
  to: string
  subject: string
  text: string
  attachments?: EmailAttachment[]
}

/**
 * Minimal transactional email send via Resend. Throws EMAIL_NOT_CONFIGURED when
 * the API key / from address are missing so callers can show a clear message.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new ApplicationError(
      "Email is not configured (missing RESEND_API_KEY/EMAIL_FROM).",
      "EMAIL_NOT_CONFIGURED",
    )
  }

  // En sandbox, Resend solo entrega al dueño de la cuenta. Si hay un destinatario
  // de redirección configurado, mandamos AHÍ (para que la notificación llegue de
  // verdad en pruebas) e indicamos en el asunto a quién iba dirigida originalmente.
  // En producción (dominio verificado) esto no aplica: se respeta el destinatario.
  const redirectTo =
    emailConfigStatus() === "sandbox" && env.EMAIL_SANDBOX_TO ? env.EMAIL_SANDBOX_TO : null
  const to = redirectTo ?? input.to
  const subject = redirectTo ? `[→ ${input.to}] ${input.subject}` : input.subject

  const resend = new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text: input.text,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  })

  if (error) {
    throw new ApplicationError("Email could not be sent.", "EMAIL_SEND_FAILED", error)
  }
}
