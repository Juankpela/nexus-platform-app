# NEXUS — Field Worker Experience (Product Strategy)

> Rol: Principal Product Architect (Salesforce FS / ServiceMax / Zinier / Oracle FS).
> Alcance: **diseño de producto**. Sin código, tablas, migraciones ni implementación.
> Premisa de seguridad: respeta el RBAC multi-tenant + RLS + permisos ya auditados.
> Fecha: 2026-06-09.

---

## 0. Tesis

NEXUS ya **planifica** el trabajo (Work Orders → Assignments → Technicians → Dispatch
→ Calendar). Lo que falta es **ejecutarlo en campo**. El Field Worker Experience (FWX)
es la capa donde el técnico vive su jornada: acepta, viaja, ejecuta, documenta y cierra
— **offline-first**, con evidencia, geolocalización y firma — sin romper el modelo de
permisos existente y, de hecho, **corrigiendo** el exceso de privilegio detectado
(`service.work_orders.write` global para `technician`).

Principio rector: **el técnico no opera el sistema; el sistema lo acompaña en su día.**
Una pantalla, una tarea a la vez, lo mínimo para avanzar.

---

## Parte 1 — Modelo de Acceso del Técnico

### Problema heredado (de la auditoría de autorización)
Hoy el rol `technician` tiene **`service.work_orders.write` global** → puede crear,
modificar y cancelar **cualquier** WO del tenant. Eso es **exceso de privilegio** para
un ejecutor de campo. El FWX debe operar bajo *least privilege* y *record-level scope*.

### Modelo recomendado: "Execute, don't administer"
El técnico no recibe permisos de administración de WOs; recibe permisos de **ejecución
sobre sus propias asignaciones**.

| Capacidad | ¿Técnico? | Regla |
|-----------|-----------|-------|
| Ver WOs del tenant | ❌ | Solo las **asignadas a él** (record-level) |
| Ver sus asignaciones / agenda | ✅ | `scheduling.read` acotado a `assigned_technician_id = self` |
| Crear Work Orders | ❌ | Es función de supervisor/dispatcher |
| Cancelar Work Orders | ❌ | Cancelar = decisión operativa del dispatcher |
| Modificar campos de la WO (cliente, activo, prioridad) | ❌ | Inmutable para el técnico |
| **Ejecutar** la WO (aceptar, viajar, llegar, trabajar, pausar) | ✅ | Solo sobre WOs propias y en transiciones válidas |
| **Cerrar/Completar** la WO | ✅ (condicionado) | Solo con evidencia + firma cuando aplique |
| Marcar "No se pudo completar" | ✅ | Con motivo obligatorio |
| Reportar incidencias | ✅ | Escala al supervisor, no resuelve solo |
| Subir evidencias (fotos/notas/firma) | ✅ | Solo en WOs propias |
| Reasignar a otro técnico | ❌ | Solo dispatcher (ya validado en Scheduling) |
| Editar técnicos / catálogos / clientes | ❌ | Fuera de su rol |

### Cómo se implementa **sin romper** el RBAC actual
- **Nuevos permisos granulares** (Parte 11) que reemplazan el uso de `work_orders.write`
  para el técnico: ejecutar ≠ administrar.
- **Scope por registro**: el técnico solo ve/actúa sobre WOs donde es el
  `assigned_technician_id` (o tiene un `work_order_assignment` activo). Esto cierra el
  hallazgo R4 de la auditoría (hoy el RBAC es tenant-wide).
- La UI de campo **nunca** muestra acciones administrativas; el servidor las **niega**
  igual (defensa en profundidad, como ya hace NEXUS).

---

## Parte 2 — Flujo Completo del Técnico (Assigned → Completed)

```
[Dispatcher asigna]  →  ASSIGNED
        │  push/notif "Tienes una nueva orden"
        ▼
   ACCEPTED        ← técnico acepta (o rechaza con motivo → vuelve a dispatcher)
        │  captura GPS "accept"
        ▼
   TRAVELING       ← "En camino" (ETA, navegación externa opcional)
        │  captura GPS "depart"
        ▼
   ON SITE         ← "Llegué" (captura GPS "arrive" → valida cercanía al sitio)
        │  fotos ANTES (obligatorias)
        ▼
   WORKING         ← ejecuta checklist/tareas; puede PAUSAR (motivo) o reportar incidencia
        │  fotos DURANTE (opcionales)
        ▼
   [resolución]
     ├─ COMPLETED            → fotos DESPUÉS (oblig.) + resumen + firma cliente
     └─ UNABLE TO COMPLETE   → motivo obligatorio + evidencia (incidencia) → dispatcher
```

Eventos que el sistema registra automáticamente en el timeline de la WO (reutilizando
el Activity Timeline existente): aceptación, salida, llegada, inicio, pausa/reanudación,
incidencia, cierre — cada uno con timestamp, actor y (si aplica) GPS.

---

## Parte 3 — Estados de Ejecución (ciclo de vida)

| Estado | Obligatorio | Notas |
|--------|-------------|-------|
| `assigned` | ✅ | Estado inicial al asignar (existe hoy como WO `scheduled`/assignment `scheduled`) |
| `accepted` | ✅ | Confirma compromiso; habilita el resto |
| `traveling` | ⬜ recomendado | Útil para ETA y dispatch en vivo; omitible en trabajo en sitio fijo |
| `on_site` | ✅ | Ancla geolocalización + fotos "antes" |
| `working` | ✅ | (equivale a `in_progress` actual) |
| `paused` | ⬜ recomendado | Con motivo (espera material, almuerzo, cliente) — no cuenta como trabajo |
| `completed` | ✅ | Terminal feliz; exige evidencia + firma según política |
| `unable_to_complete` | ✅ | Terminal con incidencia; devuelve al dispatcher para reprogramar |
| `cancelled` | ✅ | Terminal; **solo dispatcher** (no el técnico) |

**Mapeo con lo existente:** NEXUS ya tiene `assignment_status` (scheduled/in_progress/
completed/cancelled) y `work_order_status` (new/scheduled/dispatched/in_progress/on_hold/
completed/cancelled). El FWX **no inventa un modelo paralelo**: estos sub-estados de
ejecución (accepted/traveling/on_site/paused/unable_to_complete) son un **refinamiento**
que vive sobre la asignación, y se proyectan a los estados macro que el dispatcher ya ve
(p.ej. accepted+traveling+on_site+working → "in_progress"; unable_to_complete → "on_hold").

> Recomendación: modelar los sub-estados como **atributo de la asignación**, no como
> nuevos estados de la WO, para no fragmentar el dominio ya construido.

---

## Parte 4 — Geolocalización (event-based, privacy-first)

**Filosofía:** NEXUS **no hace tracking continuo** del técnico (privacidad + batería +
legalidad laboral). Captura ubicación **solo en eventos de negocio**:

| Evento | Captura GPS | Uso |
|--------|-------------|-----|
| Accept | ✅ | Punto de partida |
| Depart (traveling) | ✅ | ETA / ruta |
| Arrive (on_site) | ✅ | **Verificación de presencia** (distancia al sitio del activo/cliente) |
| Complete | ✅ | Prueba de ejecución en sitio |
| Incident | ✅ | Contexto del problema |

**Qué se almacena:** lat/long + precisión + timestamp + evento, atado a la asignación.
**No** se almacena trayectoria minuto a minuto.

**Qué ve el supervisor:** últimos eventos geolocalizados por técnico, "llegó a X m del
sitio", mapa de paradas del día (futuro: Route Optimization). **No** ve al técnico "en
vivo" salvo durante un trabajo activo.

**Qué ve el técnico:** transparencia total — "se registró tu llegada", con opción de
nota si el GPS falla. Consentimiento explícito al activar el modo campo.

**Privacidad:** geo solo durante jornada/eventos; nunca fuera de WO activa; configurable
por tenant (algunos países restringen geolocalización laboral).

---

## Parte 5 — Evidencia Fotográfica

| Momento | Política | Razón |
|---------|----------|-------|
| **Antes** (on_site, pre-trabajo) | **Obligatoria** | Estado inicial del activo/sitio — protege al técnico y al cliente |
| **Durante** (working) | Opcional / recomendada | Documenta hallazgos, repuestos cambiados |
| **Después** (pre-complete) | **Obligatoria** | Prueba de trabajo terminado; condición para cerrar |

**Reglas de producto:**
- Mínimo configurable por tipo de WO/política del tenant (p.ej. 1 antes, 2 después).
- Captura **in-app** (no galería) para garantizar autenticidad + sello de tiempo + geo.
- Compresión local antes de subir (offline-friendly).
- La WO **no puede pasar a `completed`** si faltan las fotos obligatorias (gate de UX +
  validación server al sincronizar).

---

## Parte 6 — Incidencias

Catálogo estándar (tipificado, no texto libre) + nota:

| Incidencia | Efecto en la orden | Ruta |
|-----------|--------------------|------|
| Cliente ausente | → `unable_to_complete` (sub: customer_absent) | Dispatcher reprograma |
| Sin acceso al sitio | → `unable_to_complete` (no_access) | Dispatcher reprograma |
| Material/repuesto faltante | → `paused` o `unable_to_complete` | Genera necesidad de inventario (futuro) |
| Problema de seguridad | → `paused` + **escala urgente** | Notifica supervisor (alta prioridad) |
| Trabajo incompleto | → `unable_to_complete` (partial) | Posible WO de seguimiento |
| Escalación técnica | mantiene estado + **escala** | Crea/relaciona un **Case** (reusa Service) |

**Principios:**
- Toda incidencia exige **motivo tipificado + evidencia** (foto/nota) y captura geo.
- La incidencia **nunca** cancela la WO (cancelar = dispatcher); a lo sumo la bloquea o
  la marca como no completable, devolviendo control al dispatcher.
- Escalaciones de seguridad disparan notificación inmediata (cuando exista el event bus).

---

## Parte 7 — Firma del Cliente

| Método | Pros | Contras | Veredicto |
|--------|------|---------|-----------|
| Manuscrita en pantalla | Universal, funciona **offline**, percepción de "acta firmada" | Repudiable legalmente en algunos países | ✅ **Default** |
| PIN del cliente | Rápido | El cliente no siempre tiene PIN; gestión de credenciales | ⬜ Nicho (B2B con portal) |
| SMS (OTP) | No repudio fuerte | **Requiere conectividad** + costo SMS | 🔁 Fallback online |
| Email (confirmación/link) | Trazable, barato | Requiere conectividad; fricción | 🔁 Respaldo |

**Estrategia ideal (híbrida, offline-first):**
1. **Firma manuscrita en dispositivo** como mecanismo primario (funciona sin red) +
   captura de **nombre + cargo** de quien firma + geo + timestamp + foto "después".
2. Al **sincronizar**, enviar automáticamente un **email/SMS de confirmación** al
   contacto del cliente con el acta (PDF) → añade no-repudio sin bloquear el cierre en
   campo.
3. Si el cliente está ausente → "firma no disponible" con justificación tipificada
   (enlaza a incidencia), permitido por política del tenant.

---

## Parte 8 — Offline First

**Datos que deben existir localmente (al inicio de jornada / "sync down"):**
- Las **asignaciones del día** del técnico (WO + caso + activo + cliente + contacto +
  ubicación + checklist/instrucciones).
- Catálogos mínimos: tipos de incidencia, política de fotos/firma del tenant.
- Borradores en curso (fotos, notas, firma) **persistentes** en el dispositivo.

**Acciones que funcionan 100% offline:**
- Aceptar, viajar, llegar, iniciar, pausar, reanudar.
- Tomar fotos, escribir notas, registrar incidencias, capturar firma.
- Avanzar el estado de ejecución y "completar" (queda **pendiente de sync**).

**Acciones que requieren conectividad:**
- Recibir nuevas asignaciones (sync down).
- Confirmación SMS/email de firma.
- Que el dispatcher vea el cierre reflejado (sync up).

**Sincronización y conflictos:**
- **Outbox local**: cada acción se encola como evento con `client_timestamp` + id idempotente.
- **Sync up** en background al recuperar señal; reintentos con backoff.
- **Resolución de conflictos**:
  - El estado de ejecución es **append-only por eventos** (no "último gana" sobre un
    campo) → el orden temporal reconstruye el ciclo de vida sin pisar datos.
  - Si el dispatcher canceló la WO mientras el técnico trabajaba offline → al sincronizar,
    el sistema **conserva la evidencia** del técnico y marca conflicto para revisión
    (no se pierde trabajo; el supervisor decide).
  - Las **fotos/firma nunca se descartan**: si el cierre falla, quedan adjuntas como
    evidencia pendiente.
- **Evitar pérdida de datos:** todo se escribe primero local y persistente; la UI muestra
  "pendiente de sincronizar" con contador; nada depende de tener red para guardar.

---

## Parte 9 — UX Móvil (jornada del técnico)

Diseño: **una mano, una tarea**. Botón primario grande por pantalla. Mínimo texto.

| Pantalla | Propósito | Elementos clave |
|----------|-----------|-----------------|
| **Home** | "¿Qué hago ahora?" | Próxima parada, estado de sync, # pendientes, botón "Iniciar día" |
| **My Schedule** | Agenda del día/semana | Lista por hora; reusa datos de Scheduling/Calendar filtrados a *self* |
| **My Work Orders** | Bandeja de asignaciones | Cards por estado (aceptar / en sitio / en curso) |
| **Work Order Detail** | Centro de ejecución | Cliente, activo, instrucciones, **botón de estado primario**, checklist, evidencia |
| **Capture Photos** | Cámara in-app | Antes/durante/después; cuenta lo obligatorio restante |
| **Report Incident** | Reporte tipificado | Tipo + foto + nota + geo; un toque |
| **Complete Work Order** | Cierre guiado | Valida fotos/firma → resumen → firma → "Completar" |
| **Profile** | Estado personal | Estado (activo/licencia), sync, cerrar sesión, soporte |

Patrón transversal: **barra de sincronización** siempre visible (online/offline + #
pendientes) y **deshacer** en acciones recientes.

---

## Parte 10 — Arquitectura de Producto (decisión)

| Criterio | Opción A — PWA `/worker` sobre NEXUS Web | Opción B — App nativa (React Native) |
|----------|------------------------------------------|--------------------------------------|
| Velocidad de salida | 🟢 Alta (reusa auth, RBAC, RLS, dominio, composiciones) | 🔴 Baja (nuevo proyecto, stores, releases) |
| Costo | 🟢 Bajo (un codebase, un deploy) | 🔴 Alto (equipo móvil, mantenimiento dual) |
| Mantenimiento | 🟢 Un solo sistema de permisos/datos | 🟠 Sincronizar reglas en dos lados |
| Experiencia offline | 🟠 Buena (Service Worker + IndexedDB + outbox) | 🟢 Excelente (SQLite nativo, background sync robusto) |
| Cámara / GPS | 🟢 Suficiente (APIs web modernas) | 🟢 Superior (acceso pleno, background) |
| Distribución | 🟢 URL + "Add to Home Screen" | 🟠 App stores (revisión, fricción) |
| Push notifications | 🟠 Web Push (iOS limitado pero viable) | 🟢 Nativo completo |

**Recomendación: Opción A — PWA `/worker`, con camino a nativa en Fase 4 si la
demanda lo justifica.**

Razones:
- **Reutiliza toda la plataforma**: mismo RBAC/RLS/tenant isolation auditado, mismas
  composiciones (Scheduling/Dispatch/Work Orders) → cero divergencia de reglas.
- **Time-to-value** muy superior; valida el producto antes de invertir en nativo.
- La PWA cubre el 90% del caso (offline con Service Worker + IndexedDB + outbox; cámara
  y geo por eventos). El 10% nativo (background sync agresivo, push iOS) llega en Fase 4
  con React Native **solo si** las métricas de campo lo piden — y para entonces el dominio
  y la lógica offline ya estarán probados y serían portables.

---

## Parte 11 — Impacto sobre Seguridad (usando la auditoría)

### Permisos NUEVOS (granulares, least-privilege)
- `service.field.read` — ver **mis** asignaciones y sus WOs (record-scoped a self).
- `service.field.execute` — avanzar estados de ejecución (accept→…→complete) **solo en
  WOs propias**.
- `service.field.evidence.write` — subir fotos/notas/firma en WOs propias.
- `service.field.incident.report` — crear incidencias/escalaciones.

### Permisos EXISTENTES que deben cambiar (cierra hallazgos R2/R4)
- **Quitar `service.work_orders.write` del rol `technician`.** Hoy le da poder global de
  administración (crear/cancelar/editar cualquier WO). Se sustituye por los
  `service.field.*` anteriores → el técnico **ejecuta** pero no **administra**.
- Introducir **scope a nivel de registro** para `technician`: la RLS/derecho de lectura
  de WOs y asignaciones se restringe a `assigned_technician_id = self` (hoy es
  tenant-wide). Esto materializa la recomendación R4 de la auditoría.
- `supervisor`/`dispatcher`/`tenant_admin` conservan `service.work_orders.write` y
  `scheduling.write` (administran y reasignan).

### Invariantes de seguridad a mantener
- Defensa en profundidad: la UI de campo oculta lo no permitido **y** el servidor
  (Server Actions + RLS) lo niega, igual que el resto de NEXUS.
- Tenant isolation intacto: el técnico nunca ve datos de otro tenant (RLS + FKs compuestas
  ya garantizan esto).
- Las acciones de campo se auditan (reusa el Audit Trail): quién, qué, cuándo, dónde (geo).

---

## Parte 12 — Roadmap (valor / velocidad / bajo riesgo / reuso)

### Fase 1 — "MVP de ejecución" (mayor valor, menor riesgo)
- PWA `/worker` con login + **My Schedule / My Work Orders / WO Detail** (read, record-scoped).
- Permisos nuevos `service.field.read/execute` + **quitar** `work_orders.write` a technician.
- Ciclo de estados núcleo: accept → on_site → working → completed / unable_to_complete.
- Notas + cierre básico **online**.
- Reusa: Scheduling, Dispatch, Work Orders, Audit, RBAC. **Sin nuevas tablas de dominio
  más allá de evidencia/estado de ejecución (decisión técnica posterior).**

### Fase 2 — "Evidencia y campo real"
- Fotos in-app (antes/después obligatorias) + firma manuscrita.
- Geolocalización por eventos (accept/arrive/complete) + verificación de presencia.
- Incidencias tipificadas + escalación a Case.

### Fase 3 — "Offline First"
- Service Worker + IndexedDB + **outbox** con sync en background y resolución de conflictos
  por eventos.
- Confirmación de firma por email/SMS al sincronizar.
- Indicadores de sync y "pendientes" en toda la UX.

### Fase 4 — "Escala y nativo (condicional)"
- Push notifications, navegación/ETA, route optimization (se apoya en Dispatch).
- Evaluación React Native **solo si** las métricas exigen background sync/push iOS plenos.
- Integración con Inventory (materiales) y Capacity Planning.

---

## Resultado: la jornada ideal del técnico en NEXUS

1. **Inicia el día** → ve solo *sus* paradas (record-scoped), descargadas para trabajar
   sin red.
2. **Acepta**, viaja, **llega** (se valida su presencia), toma **fotos antes**.
3. **Ejecuta** con checklist; si algo falla, **reporta incidencia** tipificada que escala
   al supervisor — nunca cancela la orden por su cuenta.
4. **Cierra** con fotos después + **firma del cliente** (offline), y todo queda **encolado**
   para sincronizar.
5. Al recuperar señal, **sincroniza** sin pérdida de datos; el cliente recibe su acta y el
   dispatcher ve el cierre en Mission Control en (casi) tiempo real.

Todo esto **respetando el modelo de permisos existente** y **corrigiendo** el exceso de
privilegio del rol `technician`: el técnico **ejecuta su trabajo**, no administra la
plataforma.
