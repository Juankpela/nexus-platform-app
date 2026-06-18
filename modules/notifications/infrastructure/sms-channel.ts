import type { CommunicationChannel } from "@/modules/notifications/domain/communication-channel"

/**
 * Canal de SMS — PREPARADO, NO IMPLEMENTADO.
 *
 * Igual que WhatsApp: el contrato queda listo para un proveedor futuro (Twilio /
 * AWS SNS). No hay lógica de envío todavía.
 */
export class SmsChannel implements CommunicationChannel {
  readonly kind = "sms" as const

  async send(): Promise<void> {
    throw new Error("SmsChannel no implementado todavía.")
  }
}
