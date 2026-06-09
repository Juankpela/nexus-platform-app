# ADR-020 — Field Execution Domain (Bounded Contexts & Ubiquitous Language)

- **Status:** Accepted (design) · No implementado
- **Date:** 2026-06-09
- **Rol:** Principal Domain Architect (Salesforce FS / ServiceMax / Zinier / Oracle FS / DDD)
- **Alcance:** Solo dominio y lenguaje de negocio. Sin código, tablas ni implementación.
- **Es fuente de verdad para:** FWX (mobile worker), Dispatch, Calendar, Mission Control,
  Notifications, AI Agents, Reporting.

---

## 0. Problema y tesis

Hoy conviven dos vocabularios de estado que amenazan con mezclarse:
`assignment_status` (scheduled/in_progress/completed/cancelled) y los estados ricos de
campo propuestos en FWX (accepted/traveling/on_site/working/paused/…). Si no separamos
contextos, terminaremos con **estados duplicados** ("in_progress" en dos sitios) y
**contradictorios** (una asignación "completed" cuya ejecución fracasó).

**Tesis:** existen **tres agregados distintos**, cada uno **dueño de su propio estado**,
conectados **solo por eventos de dominio**. Ninguno escribe el estado de otro.

| Agregado | Pregunta que responde | Dueño del estado |
|----------|----------------------|------------------|
| **Work Order** | *¿Qué hay que hacer y por qué?* (demanda/fulfillment) | `work_order_status` |
| **Assignment** (Scheduling) | *¿Quién y cuándo se compromete?* (compromiso) | `assignment_status` (simplificado) |
| **Execution** | *¿Qué pasó realmente en campo?* (realidad) | `execution_status` (nuevo) |

Regla de oro: **un agregado solo cambia su propio estado**; los demás **reaccionan**
vía eventos mediante *policies*. Esto elimina la ambigüedad de raíz.

---

## Parte 1 — Bounded Contexts

### Work Orders (contexto: demanda de servicio)
- **Responsabilidad:** representar el trabajo a realizar sobre un activo, para un caso/
  cliente. Es el "contrato de trabajo": qué, dónde, para quién, con qué prioridad.
- **Posee:** identidad de la orden, relación con Company/Asset/Case, prioridad,
  descripción, resultado de negocio (completada/cancelada), resumen y notas de cierre.
- **NO le pertenece:** quién la hace ni cuándo (eso es Scheduling), ni los micro-pasos
  de campo (eso es Execution), ni la geolocalización/fotos/firma (Execution).

### Scheduling (contexto: compromiso en el tiempo)
- **Responsabilidad:** comprometer **un técnico** a **una ventana de tiempo** para una WO,
  garantizando **no-solape** (regla ya implementada). Reprogramar/reasignar.
- **Posee:** la asignación (técnico + ventana + duración estimada) y su validez.
- **NO le pertenece:** si el trabajo empezó/terminó realmente (Execution), ni los datos
  comerciales de la WO, ni la disponibilidad agregada (eso es Dispatch, que lo *deriva*).

### Execution (contexto NUEVO: realidad de campo)
- **Responsabilidad:** capturar lo que **de verdad** ocurrió durante la visita: aceptación,
  viaje, llegada, trabajo, pausas, evidencia, incidencias, cierre y firma.
- **Posee:** el estado de ejecución, timestamps reales, geolocalización por evento,
  fotos, firma, incidencias.
- **NO le pertenece:** crear/cancelar/editar la WO (eso es administración → Work Orders/
  Dispatch), ni reasignar (Scheduling).

### Technicians (contexto: fuerza de trabajo)
- **Responsabilidad:** identidad y estado laboral del técnico (active/inactive/on_leave),
  skills/territorios (futuro).
- **NO le pertenece:** carga de trabajo (la *deriva* Dispatch), ni asignaciones.

### Dispatch (contexto: visión operativa / read-model)
- **Responsabilidad:** **proyección de lectura** que combina Scheduling + Execution +
  Technicians para responder "¿quién está libre/ocupado/sobrecargado hoy?".
- **NO le pertenece:** ningún estado propio; **no muta nada**. Es CQRS-read.

### Calendar (contexto: visualización temporal)
- **Responsabilidad:** vista en el tiempo de los compromisos (Assignments).
- **NO le pertenece:** lógica; es presentación pura sobre Scheduling (y opcionalmente
  Execution como "real vs planificado").

---

## Parte 2 — Aggregate Ownership (quién manda)

```
Work Order (1) ──< Assignment (N)  ──  (0..1) Execution
   demanda            compromiso            realidad
```

- Una **Work Order** tiene **muchas** Assignments a lo largo del tiempo (reprogramaciones,
  segundas visitas). Solo una activa a la vez (regla de negocio recomendada).
- Una **Assignment** tiene **0 o 1 Execution** (la visita real de esa cita).
- Una **Execution** pertenece a **exactamente una** Assignment.

**Estado principal vs derivado:**
- `work_order_status` = **estado de negocio**, *event-driven*: reacciona a eventos de
  Scheduling/Execution mediante policies, pero su transición a `completed`/`cancelled`
  es **decisión del contexto Work Order** (puede requerir revisión/QA).
- `assignment_status` = **compromiso**, mínimo: vigente o anulado. **No** refleja progreso.
- `execution_status` = **realidad de campo**, rico. Es la **única** fuente de "qué está
  haciendo el técnico ahora".

**Dependencias permitidas:** Execution depende de Assignment (la referencia); Assignment
depende de Work Order y Technician. **Prohibido** el sentido inverso de escritura: una
Execution **no** escribe `work_order_status`; **emite un evento** y una *policy* del
contexto Work Order decide.

---

## Parte 3 — Lifecycles (diagramas conceptuales)

### Work Order Lifecycle (negocio, event-driven)
```
new ──> scheduled ──> dispatched ──> in_progress ──> completed
 │          │             │              │
 │          └─────────────┴──────────────┴──> on_hold ──> (re-scheduled) ──> scheduled
 └────────────────────────(cualquiera no-terminal)────────────> cancelled
```
- `new`: creada, sin asignación.
- `scheduled`: existe una Assignment con ventana futura.   ← evento `AssignmentCreated`
- `dispatched`: el técnico aceptó / fue despachado.         ← evento `AssignmentAccepted`
- `in_progress`: la ejecución está en sitio/trabajando.     ← `WorkStarted`
- `on_hold`: bloqueada (pausa prolongada / no completable a la espera de reprogramar). ← `ExecutionFailed`/`WorkPaused`(política)
- `completed`: ejecución terminada **y** cierre validado.   ← `WorkCompleted`(+policy QA)
- `cancelled`: terminal, **solo dispatcher**.
> Todas son **terminales de negocio** salvo new/scheduled/dispatched/in_progress/on_hold.

### Assignment Lifecycle (Scheduling, SIMPLIFICADO)
```
scheduled ──> superseded   (reasignada o reprogramada → nace otra Assignment)
   │
   └────────> cancelled    (dispatcher anula la cita)
```
- `scheduled`: compromiso vigente.
- `superseded`: reemplazada por una nueva Assignment (historial de reprogramación).
- `cancelled`: anulada.
- **"Cumplida" no es un estado de Assignment**: se *deriva* de su Execution.

### Execution Lifecycle (realidad de campo, dueño = técnico)
```
pending ─> accepted ─> [traveling] ─> on_site ─> working ⇄ [paused]
   │           │                                    │
   │           └─> declined  (vuelve a dispatcher)  ├─> completed
   └─(nunca aceptada / no-show)                     └─> unable_to_complete
```
- `pending`: creada al asignar; espera aceptación.
- `accepted` / `declined`: el técnico se compromete o rechaza (con motivo).
- `traveling` *(opcional)*: en camino.
- `on_site`: llegó (ancla geo + fotos "antes").
- `working` ⇄ `paused` *(paused opcional)*.
- `completed`: terminó con evidencia + firma (según política).
- `unable_to_complete`: no pudo (motivo tipificado + incidencia).

---

## Parte 4 — Scheduling Domain (¿siguen siendo correctos los estados?)

**Veredicto: simplificar.** Los estados actuales `scheduled / in_progress / completed /
cancelled` mezclan **compromiso** con **ejecución**.
- `in_progress` y `completed` **pertenecen a Execution**, no a Scheduling. Mantenerlos en
  Assignment crea la duplicación que este ADR busca eliminar.
- **Recomendación:** `assignment_status` = `scheduled | cancelled | superseded`.
  El progreso/cierre se consulta a la Execution asociada.
- *Compatibilidad:* si por transición se conservan `in_progress`/`completed` en la columna
  actual, deben tratarse como **espejos derivados** de Execution (read-only), no como
  estado que alguien transiciona a mano. La meta es deprecarlos.

---

## Parte 5 — Execution Domain (¿todos los estados aportan?)

Pensando en **telecomunicaciones, instalaciones y mantenimiento**:

| Estado | Veredicto | Razón |
|--------|-----------|-------|
| `accepted` | ✅ **Obligatorio** | Compromiso del técnico; habilita el flujo y mide no-shows |
| `on_site` | ✅ **Obligatorio** | Ancla geo + fotos "antes"; base de "time on site" |
| `working` | ✅ **Obligatorio** | El trabajo real |
| `completed` | ✅ **Obligatorio** | Resultado feliz + evidencia/firma |
| `unable_to_complete` | ✅ **Obligatorio** | Captura fracaso con causa → reprogramación/inventario |
| `traveling` | 🟡 **Opcional (config)** | Gran valor en dispatch urbano denso/ETA; ruido en sitio fijo. Activable por tenant/tipo de trabajo |
| `paused` | 🟡 **Recomendado (config)** | Precisión de "time on site" y esperas de material; si no se usa, no surge complejidad |
| `pending`/`declined` | ✅ par mínimo | Modelar aceptación correctamente (evita "asignada = aceptada") |

**Complejidad innecesaria a evitar:** no crear estados como "qa_review", "billing_ready"
dentro de Execution — eso es Work Order/otros contextos. Execution termina en
`completed`/`unable_to_complete`; lo demás lo deciden otros agregados por evento.

---

## Parte 6 — Work Order Domain (¿debe reflejar Execution?)

**Sí, pero por derivación, no por copia.** La WO necesita un estado de negocio legible
para dispatcher/cliente/reporting, pero **no replica** los micro-estados de campo.
- Estados propios (negocio): `new / scheduled / dispatched / in_progress / on_hold /
  completed / cancelled` (los actuales sirven).
- Se **mueven por eventos** de Scheduling/Execution vía policies; nunca el técnico edita
  `work_order_status` directamente (principio "execute, don't administer").
- Mapeo de granularidad: muchos estados de Execution (accepted/traveling/on_site/working)
  colapsan a un único `in_progress` de WO. El detalle fino vive en Execution; el resumen
  vive en WO.

---

## Parte 7 — Domain Events (lenguaje de negocio)

| Evento | Emisor | Obligatorio | Reacción típica (policy) |
|--------|--------|-------------|--------------------------|
| `WorkOrderCreated` | Work Order | ✅ | — |
| `AssignmentCreated` | Scheduling | ✅ | WO → `scheduled` |
| `AssignmentRescheduled` / `Reassigned` | Scheduling | ✅ | Assignment previa → `superseded` |
| `AssignmentCancelled` | Scheduling | ✅ | WO → `new`/`on_hold` |
| `AssignmentAccepted` | Execution | ✅ | WO → `dispatched`; Execution → `accepted` |
| `AssignmentDeclined` | Execution | ✅ | Vuelve a dispatcher (alerta) |
| `TechnicianDeparted` | Execution | 🟡 | ETA / Dispatch |
| `TechnicianArrived` | Execution | ✅ | Execution → `on_site`; valida presencia (geo) |
| `WorkStarted` | Execution | ✅ | WO → `in_progress` |
| `WorkPaused` / `WorkResumed` | Execution | 🟡 | WO → `on_hold` si pausa prolongada |
| `IncidentReported` | Execution | 🟡 | Notifica supervisor; puede crear/relacionar **Case** |
| `PhotoCaptured` | Execution | 🟡 | Evidencia; gate de cierre |
| `CustomerSigned` | Execution | 🟡 | Evidencia de aceptación; gate de cierre (según política) |
| `WorkCompleted` | Execution | ✅ | WO → `completed` (+ QA policy); Assignment cumplida |
| `ExecutionFailed` (UnableToComplete) | Execution | ✅ | WO → `on_hold`; sugiere reprogramar |
| `WorkOrderCompleted` | Work Order | ✅ | Cierra negocio; dispara reporting/notif |
| `WorkOrderCancelled` | Work Order | ✅ | Anula compromisos |

**Obligatorios** = forman el esqueleto del ciclo y el reporting. **Opcionales** = enriquecen
(ETA, evidencia, incidencias) sin los cuales el sistema sigue siendo coherente.

> Estos son **nombres del negocio**, no implementación. Cuando exista el Event Bus, estos
> son exactamente los topics.

---

## Parte 8 — Mission Control (métricas sin ambigüedad)

| Métrica | Dominio fuente | Por qué |
|---------|----------------|--------|
| Pipeline / oportunidades / ingresos | CRM | — |
| Casos abiertos / SLA | Service | — |
| **Asignaciones de hoy** | **Scheduling** | Compromisos, no trabajo real |
| **Técnicos disponibles/ocupados/sobrecargados** | **Dispatch** (deriva de Scheduling+Technicians) | Capacidad |
| **Órdenes en progreso / completadas hoy** | **Execution → Work Order** | Realidad de campo |
| **Atención: no-shows, unable_to_complete, incidentes** | **Execution** | Lo que requiere acción |

Regla anti-ambigüedad: "programado" siempre = Scheduling; "en curso/terminado" siempre =
Execution; "resultado de negocio" siempre = Work Order. Mission Control **etiqueta** la
fuente para no confundir "asignado" con "trabajando".

---

## Parte 9 — Calendar (¿qué representa?)

**Calendar representa Assignments** (compromisos planificados) — el "deber ser".
- Vista primaria: ventanas planificadas (Scheduling).
- **Opcional (capa "actual vs planificado"):** superponer los timestamps reales de
  Execution (llegada/inicio/fin) para ver desvíos. Esto es *enriquecimiento visual*, no
  un cambio de dueño: Calendar **lee** ambos contextos, no muta ninguno.
- No representa estado de negocio de la WO (eso es Work Orders/Mission Control).

---

## Parte 10 — Dispatch (qué consume y qué no)

- **Consume:** Scheduling (asignaciones del día), Execution (estado real para saber si un
  técnico está realmente en sitio/atrasado), Technicians (disponibilidad).
- **NO consume:** datos comerciales de la WO (cotizaciones, ingresos), ni internals de CRM.
  Dispatch razona sobre **capacidad y ejecución**, no sobre dinero.
- **No muta nada:** es read-model. Las acciones (reasignar) las realiza vía el contexto
  Scheduling (que valida overlap), no Dispatch directamente.

---

## Parte 11 — Field Worker App ("Execute, don't administer")

| El técnico VE | El técnico NO necesita ver |
|---------------|----------------------------|
| `execution_status` (sus pasos) | `work_order_status` administrativo completo |
| Contexto mínimo de la WO (cliente, activo, instrucciones) | catálogo de WOs del tenant |
| Su agenda (Assignments propias) | agenda de otros técnicos |

| Acciones permitidas (Execution) | Acciones prohibidas |
|---------------------------------|---------------------|
| accept / decline, depart, arrive, start, pause/resume | crear/editar/cancelar Work Order |
| complete / unable_to_complete | reasignar / reprogramar (Scheduling) |
| capturar fotos/firma, reportar incidencia | cambiar prioridad/cliente/activo |

El técnico **solo transiciona estados de Execution** sobre **sus** asignaciones. Todo lo
demás es administración de otros contextos.

---

## Parte 12 — Reporting (procedencia de cada métrica)

| Métrica | Dominio | Cálculo conceptual |
|---------|---------|--------------------|
| **Utilization** | Scheduling (+Execution para "real") | minutos comprometidos / capacidad |
| **Completion Rate** | Work Order / Execution | WOs `completed` / WOs trabajadas |
| **Unable-To-Complete Rate** | Execution | `unable_to_complete` / ejecuciones |
| **Average Time On Site** | Execution | `arrived → completed` |
| **Average Travel Time** | Execution | `departed → arrived` |
| **First-Time-Fix Rate** | Work Order (+Execution) | WOs resueltas en **1** asignación/ejecución |
| **No-show Rate** | Execution | `declined`/nunca aceptadas vs asignadas |

Procedencia clara = sin métricas ambiguas: la utilización es *planificación*; el time-on-site
es *ejecución*; el first-time-fix es *negocio* (cuántas visitas necesitó la orden).

---

## Parte 13 — AI Readiness (lenguaje, no modelos)

Los agentes consumen los **eventos y estados** definidos arriba (no nuevas estructuras):

- **Scheduling Agent:** lee capacidad (Dispatch), asignaciones y la regla de no-solape;
  propone slots. Lenguaje: `AssignmentCreated/Rescheduled`, `availableMinutes`, overlap.
- **Dispatch Agent:** lee `execution_status` + geo + workload en vivo; detecta atrasos
  (técnico no `on_site` cerca de la ventana) y sugiere reasignar. Lenguaje:
  `TechnicianArrived`, `WorkStarted`, `ExecutionFailed`, sobrecarga.
- **Forecast Agent:** lee histórico de Execution (duraciones reales, completion rate,
  unable-to-complete) para predecir demanda/capacidad. Lenguaje: time-on-site, travel,
  first-time-fix.

Como cada métrica/evento tiene **un único dueño**, los agentes razonan sin ambigüedad y
el Event Bus tiene topics no solapados.

---

## Decisión (resumen normativo)

1. **Tres agregados, tres estados, un dueño cada uno.** Work Order (negocio), Assignment
   (compromiso), Execution (realidad).
2. **Scheduling se simplifica** a `scheduled | cancelled | superseded`. `in_progress`/
   `completed` dejan de ser estado de Assignment (pasan a Execution / se derivan).
3. **Execution es un agregado nuevo** con `pending → accepted → [traveling] → on_site →
   working ⇄ [paused] → completed | unable_to_complete` (+ `declined`). Núcleo obligatorio:
   accepted, on_site, working, completed, unable_to_complete.
4. **Work Order conserva su estado de negocio**, movido **por eventos** (no por copia ni
   por el técnico).
5. **Conexión solo por Domain Events**; ningún agregado escribe el estado de otro.
6. Dispatch/Calendar/Mission Control son **lectores**; FWX **solo** transiciona Execution.

## Consecuencias
- ✅ Elimina duplicación ("in_progress" en dos sitios) y estados contradictorios.
- ✅ FWX-1 puede construirse sabiendo exactamente qué estado toca (Execution) y qué eventos
  emite.
- ✅ Event Bus, Notifications y AI Agents heredan un lenguaje único y sin solapes.
- ⚠️ Deuda a saldar en implementación: deprecar `in_progress`/`completed` de
  `assignment_status` (compatibilidad transitoria como espejo derivado).
- ⚠️ Decisión pendiente de producto: si `WorkCompleted` pasa la WO directo a `completed`
  o a un `pending_review` (QA) — depende de si el tenant exige revisión de cierre.
