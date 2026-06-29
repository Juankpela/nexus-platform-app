# Runbook P0-1 — Sacar el email del modo sandbox (entrega real al cliente)

**Estado:** BLOQUEADO en un solo paso del fundador → conseguir/verificar un dominio.
**Riesgo que cierra:** hoy `EMAIL_FROM=onboarding@resend.dev` (sandbox); Resend responde 200 pero
solo entrega al dueño de la cuenta. **El cliente final no recibe NADA** (confirmación, "voy en camino",
completado, cotización, factura). El código ya es correcto y honesto — solo falta configuración.

Referencia de código: `lib/email/send-email.ts:21-26` (`emailConfigStatus`) y `:51-54` (redirección sandbox).
En cuanto el remitente NO sea `@resend.dev`, `emailConfigStatus()` devuelve `"production"` y se respeta
el destinatario real automáticamente. **Cero cambios de código.**

---

## Pasos (≈10 min una vez exista el dominio)

### 1. Verificar el dominio en Resend
1. Resend → **Domains** → **Add Domain** → escribe el dominio (ej. `nexusapp.co` o subdominio `mail.colibriit.com`).
2. Resend muestra 3 registros DNS (DKIM `resend._domainkey`, SPF/`MX` de retorno, y a veces DMARC).
3. Cárgalos en el proveedor DNS del dominio. Espera la propagación (minutos–horas).
4. Resend → el dominio debe quedar en **Verified** (verde).

### 2. Configurar los envs en Vercel (proyecto NEXUS, entornos Production y Preview)
> Vercel → Project → Settings → Environment Variables. No tocar el código.

| Variable | Valor | Entornos |
|---|---|---|
| `EMAIL_FROM` | `NEXUS <no-reply@TU-DOMINIO-VERIFICADO>` | Production, Preview |
| `EMAIL_SANDBOX_TO` | *(borrar / dejar vacío)* | Production, Preview |
| `RESEND_API_KEY` | *(ya existe — confirmar que sigue válida)* | Production, Preview |

- `EMAIL_FROM` debe usar **exactamente** el dominio verificado en el paso 1, o Resend rechaza el envío.
- Vaciar `EMAIL_SANDBOX_TO` evita cualquier redirección residual al dueño.

### 3. Redesplegar
- Vercel → **Deployments** → Redeploy del último build de producción (para que tome los envs nuevos).

---

## Verificación (criterio de aceptación)

1. Ejecutar el chequeo de configuración (no envía correo, solo valida el estado):
   ```
   node scripts/check-email-target.mjs --env .env.prod
   ```
   Debe imprimir `deliverability: production`.
2. Prueba E2E real: crear un caso/WO en un tenant con un **email externo que NO sea el del dueño**
   (ej. un Gmail propio distinto) y disparar la confirmación. **El correo debe llegar a esa bandeja externa.**
3. Confirmar en `audit_events` que el evento de notificación registra `deliverability: "production"`
   (no `"sandbox"`). Ver `modules/scheduling/composition.ts` (auditoría de entregabilidad).

---

## Notas
- WhatsApp sigue siendo **asistido** (enlaces `wa.me` que el operador presiona). No es parte de este P0;
  ver P1-9 / P2 del audit. El email de respaldo automático (este P0) es lo que garantiza que el cliente
  reciba algo sin acción manual.
- Mientras el dominio no exista, NO afirmar al usuario final que recibió comunicación por correo.
