/**
 * Contrato de canal de comunicación con el CLIENTE (externo), agnóstico del medio.
 *
 * Un caso de uso (p. ej. "avisar salida del técnico") depende SOLO de esta
 * interfaz, nunca de un canal concreto. El MVP implementa `EmailChannel`;
 * `WhatsAppChannel` y `SmsChannel` quedan preparados como contrato pero NO
 * implementados. Agregar un canal futuro no debe tocar la lógica de negocio.
 */

export type ChannelKind = "email" | "whatsapp" | "sms"

/**
 * Mensaje saliente hacia un cliente. `subject` lo usan los canales que lo
 * soportan (email); WhatsApp/SMS pueden ignorarlo. `to` es el destino propio del
 * canal (email hoy; teléfono en canales futuros).
 */
export type OutboundMessage = {
  to: string
  subject: string
  body: string
}

export interface CommunicationChannel {
  readonly kind: ChannelKind
  send(message: OutboundMessage): Promise<void>
}
