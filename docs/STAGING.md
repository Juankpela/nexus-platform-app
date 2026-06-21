# Entorno STAGING de NEXUS

Entorno aislado para validar cambios (migraciones, flujos) **antes** de producción.
Creado para desbloquear la validación funcional de Fase 2 sin tocar prod.

## Proyectos Supabase

| Entorno | Ref | URL |
|---|---|---|
| **Producción** | `orueodkxqhtbqjddpkrr` | https://orueodkxqhtbqjddpkrr.supabase.co |
| **Staging** | `oyjvnzjdgbzwojmjjlyn` | https://oyjvnzjdgbzwojmjjlyn.supabase.co |

- Org: `kiixnhppuwjznabqrumg` · Región: `us-east-1` (igual que prod).
- Contraseña de BD de staging: guardada por el dueño (se mostró al crear; no se versiona).
- Staging tiene **las 49 migraciones + Fase 2** aplicadas. Datos: vacío (sembrar con `scripts/seed-*.mjs` apuntando a staging si se requiere).

## Configuración local

- `.env.local` apunta a **STAGING** (Supabase URL/keys + `AUTH_SECRET` propio).
- Los valores de prod quedaron respaldados en `.env.local.prod.bak` (gitignored).
- Falta pegar `GOOGLE_MAPS_API_KEY` (la misma de Vercel) para validar el escenario Geocoding.

## Guardrail dev→prod

- `npm run dev` ejecuta `predev` → `scripts/check-db-target.mjs`, que **bloquea** si `.env.local` apunta a prod.
- Escape consciente: `ALLOW_PROD_DEV=1 npm run dev`.
- Verificar destino en cualquier momento: `npm run db:check-target`.

## Migraciones (staging-first)

```
npm run db:link:staging      # enlaza el CLI a staging
npm run db:push              # aplica migraciones pendientes a STAGING
# validar funcionalmente…
npm run db:link:prod         # enlaza a prod (acción consciente)
npm run db:push              # promueve a PROD
```
`npm run db:link` (sin sufijo) ahora **falla a propósito** para forzar elegir entorno.

## Hallazgo: orden de migraciones

`20260620_report_categorization.sql` (sin sufijo numérico) ordenaba **después** de
`20260620001..006` y rompía el replay limpio (la columna `cases.reported_skill_id`
no existía cuando `20260620001` la indexaba). Se renombró a
`20260620000_report_categorization.sql`.

**Reconciliación pendiente en PROD:** cuando se haga `db push` a prod, Supabase verá
`20260620000` como nueva (re-aplica SQL idempotente → inofensivo) y `20260620` como
versión remota huérfana (sin archivo). Opcional limpiar con
`supabase migration repair --status reverted 20260620`. Sin riesgo de datos.

## Flujo de despliegue

```
local (→ staging) → push rama staging → Vercel Preview (→ staging)
  → validación funcional (Playwright) → merge a main → Vercel Production (→ prod)
```
(El wiring de Vercel Preview por scope de entorno queda como extensión natural.)
