# NEXUS — Product Vision Freeze

> **Estado:** CONGELADO · **Fecha:** 2026-06-10 · **Autoridad:** Founder + Product Architecture
> Este documento define la identidad oficial de Nexus. Cualquier feature, módulo o migración
> que contradiga este documento debe ser rechazado o este documento debe ser modificado
> explícitamente primero. No se construye fuera de esta frontera sin enmienda formal.

---

## 0. Propósito

Congelar la identidad de Nexus **antes** de continuar desarrollando funcionalidades, para
evitar el riesgo de convertirse en un "Salesforce simplificado" sin alma. Este documento
es la frontera de alcance: define qué es Nexus, qué flujos soporta, y —con igual fuerza—
qué NO es y qué NO se construye.

---

## 1. Definición oficial

**Nexus es la plataforma operativa que une *vender* y *ejecutar* servicios en campo para
empresas latinoamericanas que necesitan la capacidad de Salesforce Field Service sin su
costo ni su complejidad.**

Nexus cierra un solo lazo: **captar → vender o atender → ejecutar → cobrar**, en una sola
plataforma, en español, adaptada a la realidad operativa y fiscal de LATAM.

---

## 2. Los tres dominios

Nexus se compone de **tres dominios** y solo tres:

| Dominio | Alcance | Naturaleza |
|---|---|---|
| **Sales** | Lead, Account, Contact, Opportunity, Quote, Sales Order | Embudo comercial. Termina o bifurca en la Quote. |
| **Service** (incluye Field Service) | Case / Service Request, Asset, Work Order, Scheduling, Dispatch, Technician, Execution, Material Consumption | Atención y ejecución operativa. Un solo dominio. |
| **Revenue Operations** | Product, Price Book, Inventory/Material, Invoice, Payment, Analytics, AI | Tejido conectivo y cierre de caja. Sirve a Sales y Service por igual. |

### 2.1 Principio innegociable: Service + Field Service = un solo dominio

Field Service **NO** es un producto independiente. Es la **extensión operacional natural de
Service**. No se vende, empaqueta, factura ni modela por separado. Cases, Work Orders,
Scheduling, Dispatch, Technicians, Execution y Material Consumption viven en el mismo dominio.

---

## 3. Los tres flujos soportados

Nexus soporta exactamente **tres flujos de valor**. Todo el producto existe para servirlos.

### Flujo A — Venta de Producto
```
Lead → Opportunity → Quote → Sales Order → Invoice → Payment
```
Sin técnicos, sin dispatch, sin Work Orders, sin visitas.

### Flujo B — Venta de Servicio
```
Lead → Opportunity → Quote → Work Order → Dispatch → Technician
     → Execution → Material Consumption → Invoice → Payment
```

### Flujo C — Solicitud de Servicio (sin venta)
```
Customer → Service Request → Case → Work Order → Dispatch → Technician
        → Execution → Material Consumption → Invoice (opcional) → Payment (opcional)
```
La mayoría del volumen real de Work Orders nace aquí: soporte, garantías, mantenimiento
preventivo/correctivo, incidentes, reclamos, inspecciones. **Ninguna Work Order de este
flujo depende de una Opportunity ni de una Quote.**

---

## 4. Work Order: origen polimórfico (decisión congelada)

La Work Order tiene un **origen variable y mutuamente excluyente**. Puede nacer de:

1. **Quote** (Flujo B — venta de servicio)
2. **Case / Service Request** (Flujo C — soporte/mantenimiento)
3. **Contract** (futuro — mantenimiento recurrente)

Reglas congeladas:
- Una Work Order **nunca** está obligada a depender de una Opportunity.
- Una Work Order **nunca** está obligada a depender de una Quote.
- Una Work Order **debe** tener exactamente **un** origen. Una Work Order huérfana es un
  defecto de trazabilidad y de facturación, no un estado válido.
- **El origen determina la facturabilidad:**
  - Origen **Quote** → facturable (contra la venta cerrada).
  - Origen **Case bajo garantía/contrato** → **no facturable** (ya cubierto).
  - Origen **Case sin cobertura** (correctivo fuera de garantía) → facturable; la factura
    nace de la Work Order misma.

---

## 5. Invoice: polimórfica (decisión congelada)

Invoice es **un único punto de convergencia de caja** con **tres orígenes posibles**:

1. **Sales Order** (Flujo A)
2. **Work Order originada desde Quote** (Flujo B)
3. **Work Order originada desde Case** (Flujo C)

Tres orígenes, **un solo sistema de facturación**. Construir dos sistemas de facturación
separados traiciona la visión unificada y está **prohibido** por este documento.

### Modelo unificado (norte conceptual)
```
                    ┌─ Opportunity → Quote → Sales Order ─┐
Lead ───────────────┤                                      │
                    └─ Opportunity → Quote ──┐             │
                                              ├─ WORK ORDER ┤
Customer → Service Request → Case ────────────┘             ├─→ INVOICE → PAYMENT
Contract (futuro) ─────────────────────────────────────────┘   (un solo cierre de caja)
```

---

## 6. Consistencia con el código actual

Inventario factual del repositorio (`nexus-platform/`, arquitectura hexagonal/DDD,
16 módulos, multi-tenant con RLS).

### 6.1 Ya existe ✅
- **Foundation:** multi-tenancy, RBAC, audit log, feature flags, request context.
- **Sales (parcial):** Account (Company), Contact, Opportunity, Quote (con revisiones y líneas).
- **Service / Field Service (sólido):** Case (con SLA y numeración atómica), Asset
  (con jerarquías), Work Order, Technician, Scheduling, Dispatch (board + workload),
  Field Execution (fotos, notas, rework via `unable_timestamp`).
- **Revenue Ops (parcial):** Product, Price Book, Material/Inventory (ledger inmutable),
  Forecasting con IA, Export jobs.
- **Hallazgo clave:** la Work Order **ya nace de un Case** (Flujo C ya construido). La rama
  comercial (Quote → Work Order, Flujo B) es la que aún no existe.

### 6.2 Falta ❌
- **Lead** (hoy solo existe Opportunity).
- **Sales Order** (la rama comercial de la Quote — Flujo A).
- **Invoice** (polimórfica) — **inexistente. Bloquea los tres flujos.**
- **Payment** — inexistente.
- **Origen polimórfico explícito de la Work Order** (hoy solo Case; falta Quote y la
  preparación para Contract).
- **Contract** (mantenimiento recurrente — futuro).

### 6.3 Veredicto de consistencia
La definición es **consistente con la arquitectura actual y no requiere refactor estructural.**
La estructura hexagonal modular acomoda Sales Order, Invoice y Payment de forma aditiva. La
bifurcación tras Quote y el origen polimórfico de la Work Order son expresables sobre lo ya
construido. **No hay deuda que impida avanzar; hay funcionalidad de cierre de caja faltante.**

---

## 7. Qué construir primero (orden de valor, no de dificultad)

Principio rector: **cerrar el lazo de dinero antes que cualquier otra cosa.** Hoy Nexus puede
ejecutar trabajo de campo sofisticado pero **no puede emitir una factura**. Eso es lo único
que importa hasta resolverlo.

| # | Entrega | Por qué primero |
|---|---|---|
| 1 | **Invoice polimórfica** | Desbloquea los tres flujos. El objeto más crítico que falta. |
| 2 | **Payment** (registro manual mínimo) | Sin esto el lazo sigue abierto. |
| 3 | **Work Order: origen + bandera de facturabilidad** | Pequeño; desbloquea cobrar correctivo fuera de garantía → caja inmediata vía Flujo C, que ya está construido. |
| 4 | **Sales Order** | Completa el Flujo A y la rama comercial del Flujo B. |
| 5 | **Lead** + conversión Lead→Opportunity | Cierra el embudo por arriba. |

**El camino más corto a caja es `Case → Work Order facturable → Invoice → Payment`**, porque
Case y Work Order ya existen. El primer peso facturado de Nexus puede venir de una orden de
servicio correctivo, no de una venta nueva.

---

## 8. Roadmap de producto

### Próximos 90 días — CERRAR EL LAZO DE DINERO
Entregas 1–5 de la sección 7. **Meta única y medible:** que un cliente real pueda ir de
solicitud/venta hasta pago cobrado, en los tres flujos. Hoy no puede.

### Meses 4–12
- Facturación electrónica localizada (DIAN Colombia primero) — **foso defensivo real** frente
  a Jobber/Housecall Pro.
- Customer Portal (cliente final ve su servicio y su factura).
- Notificaciones WhatsApp/email (obligatorio en LATAM).
- Inventory simplificado en producción + reservas atadas a Work Order.
- Pasarela de pagos (Wompi/PSE/Mercado Pago).
- **Contract** (mantenimiento recurrente) — habilita el tercer origen de la Work Order y
  convierte a Nexus en motor de ingresos recurrentes para el cliente.
- Recién aquí: Forecasting/AI como upsell premium.

---

## 9. Qué NO construir en los próximos 6 meses (frontera congelada)

Construir cualquiera de esto antes de cerrar el lazo de dinero es una violación de esta visión:

- ❌ Event bus / plano asíncrono / domain events.
- ❌ Observabilidad pesada (Sentry, OpenTelemetry, logging estructurado).
- ❌ SSO / SAML / SCIM / MFA enterprise / rate limiting.
- ❌ API pública / webhooks salientes.
- ❌ Optimización de aggregations y paginación (problema de 500k registros que no se tiene).
- ❌ Profundización adicional de Dispatch / Field Execution / Inventory avanzado (FIFO/LIFO).
- ❌ Forecasting / AI v2.
- ❌ **Contract** como entidad construida (solo se deja el origen de la Work Order *preparado*
  para recibirlo; no se implementa la entidad).
- ❌ Cualquier módulo nuevo no listado en los tres dominios de la sección 2.

> Regla de preparación: el origen polimórfico de la Work Order debe diseñarse desde ya con la
> *posibilidad* de `Contract`, aunque la entidad Contract NO se construya. Así no hay refactor
> el día que llegue.

---

## 10. Recomendación final

**Sí. Esta definición debe convertirse en la visión oficial de Nexus.**

Justificación, en tres lentes:

- **Como fundador:** la definición da a Nexus un alma —el lazo unificado venta→ejecución→cobro—
  y una frontera disciplinada que protege contra el overbuilding que ya estaba ocurriendo
  (16 módulos, IA de forecasting, inventario WMS-grade, antes de poder facturar). El mayor
  riesgo del proyecto no era técnico sino de orden de construcción; este documento lo corrige.

- **Como arquitecto de producto:** la definición es internamente consistente y compatible con
  el código actual sin refactor estructural. El origen polimórfico de la Work Order y la
  Invoice polimórfica son las dos decisiones que mantienen la plataforma unificada en lugar de
  fragmentarse en productos separados. Son correctas y deben congelarse.

- **Como inversionista:** la definición ocupa una casilla de mercado que nadie llena —venta B2B
  consultiva + ejecución de campo + inventario + facturación localizada para el mercado medio
  latinoamericano—. Salesforce/ServiceNow/Dynamics son demasiado caros y complejos; HubSpot/Zoho
  no ejecutan campo; Jobber/Housecall/FieldPulse son verticales de gremio anglosajón sin venta
  consultiva ni facturación LATAM. El riesgo restante es de ejecución (cerrar el lazo de dinero),
  no de posicionamiento.

**Condición de aprobación:** esta visión solo crea valor si se respeta la frontera de la sección
9. La identidad de Nexus no la define lo que construye, sino lo que se rehúsa a construir hasta
poder cobrar.

---

*Fin del documento. Para enmendar: requiere decisión explícita del founder y actualización de
este archivo antes de iniciar cualquier desarrollo que lo contradiga.*
