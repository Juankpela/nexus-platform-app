import "server-only"

import { sendEmail } from "@/lib/email/send-email"
import type {
  CommunicationChannel,
  OutboundMessage,
} from "@/modules/notifications/domain/communication-channel"

/**
 * Canal de email (MVP). Adapta el `sendEmail` existente (Resend) al contrato
 * `CommunicationChannel`. No agrega un nuevo motor de email: reutiliza el único
 * que ya existe.
 */
export class EmailChannel implements CommunicationChannel {
  readonly kind = "email" as const

  async send(message: OutboundMessage): Promise<void> {
    await sendEmail({
      to: message.to,
      subject: message.subject,
      text: message.body,
    })
  }
}
