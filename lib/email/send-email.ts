import "server-only"

import { Resend } from "resend"

import { env } from "@/lib/config/env"
import { ApplicationError } from "@/lib/errors/application-error"

export type EmailAttachment = { filename: string; content: Buffer }

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

  const resend = new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
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
