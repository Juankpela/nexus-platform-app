import type { CommunicationChannel } from "@/modules/notifications/domain/communication-channel"

/**
 * Canal de WhatsApp — PREPARADO, NO IMPLEMENTADO.
 *
 * El contrato existe para que la lógica de negocio ya pueda referenciar canales
 * sin acoplarse a uno. La integración real (Meta Cloud API / Twilio) y la
 * resolución de teléfono del cliente son trabajo de un hito posterior.
 */
export class WhatsAppChannel implements CommunicationChannel {
  readonly kind = "whatsapp" as const

  async send(): Promise<void> {
    throw new Error("WhatsAppChannel no implementado todavía.")
  }
}
