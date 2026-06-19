import "server-only"

import { z } from "zod"

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Nexus"),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Shared secret the Vercel Cron scheduler sends to authenticate the export worker.
  CRON_SECRET: z.string().min(1).optional(),
  // Resend (transactional email). Optional/empty-tolerant: sending is disabled
  // (sendEmail throws EMAIL_NOT_CONFIGURED) when these are empty/unset.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Mientras el remitente sea sandbox (@resend.dev), Resend SOLO entrega al dueño
  // de la cuenta. Si se define, TODAS las notificaciones se redirigen a esta
  // dirección para que lleguen de verdad durante pruebas/demo. En producción
  // (dominio verificado) se ignora y se envía al destinatario real.
  EMAIL_SANDBOX_TO: z.string().optional(),
})

export const env = serverEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_SANDBOX_TO: process.env.EMAIL_SANDBOX_TO,
})
