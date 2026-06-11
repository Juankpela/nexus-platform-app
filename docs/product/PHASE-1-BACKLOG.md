# NEXUS — Fase 1: Backlog Ejecutable (Revenue Operations)

> **Decisión de producto:** Opción **Lean** aprobada (2026-06-10).
> **Objetivo:** cerrar de punta a punta los tres flujos oficiales (A, B, C) sin sistemas
> externos ni procesos manuales fuera de Nexus.
> **Fuera de alcance Fase 1:** DIAN · AI Gateway · Analytics Operativo · Forecasting ·
> Customer Portal · Integraciones avanzadas. *(Diseñadas y visibles, no implementadas.)*
> **Documentos rectores:** `PRODUCT-VISION-FREEZE.md` · `PRODUCT-CAPABILITY-MAP.md` ·
> `REVENUE-OPERATIONS-SPEC.md` · Vision Coverage Audit · Consistency Review.
>
> Este documento NO crea capacidades nuevas ni amplía alcance. Solo prepara la ejecución de
> E1–E7 tal como fueron aprobadas.

---

## Secuencia de entrega y dependencias

```
E1 Invoice ──┬──► E3 Payments ──► [FLUJO C CERRADO] ──► E4 Revenue Timeline
E2 WO Facturable ─┘                                          │
                                                             ▼
                          E5 WO desde Quote ──► [FLUJO B CERRADO]
                                                             │
                                                             ▼
                          E6 Sales Order ─────► [FLUJO A CERRADO]
                                                             │
                                                             ▼
                          E7 Leads ───────────► [EMBUDO A y B CERRADO POR ARRIBA]
```

| Hito | Se alcanza al completar | Resultado verificable |
|---|---|---|
| **Hito 1 — Caja** | E1 + E2 + E3 | Flujo C operativo punta a punta: un cliente paga un servicio. |
| **Hito 2 — Visibilidad** | E4 | La historia financiera del cliente es visible en Nexus. |
| **Hito 3 — Venta de servicio** | E5 | Flujo B cerrado (de Opportunity en adelante). |
| **Hito 4 — Venta de producto** | E6 | Flujo A cerrado (de Opportunity en adelante). |
| **Hito 5 — Embudo completo** | E7 | Flujos A y B cerrados desde su primer nodo (Lead). |

**Definición de Hecho (DoD) global de Fase 1:** los tres flujos oficiales se ejecutan
completos dentro de Nexus, sin Excel ni herramientas externas, por un usuario con los permisos
correspondientes, con trazabilidad total origen→cobro y numeración fiscal consecutiva.

---

## E1 — Invoice Polimórfica

**Objetivo:** una sola entidad de factura capaz de nacer de Sales Order, WO-desde-Quote o
WO-desde-Case, inmutable tras emisión, con consecutivo fiscal.

**Dependencias:** ninguna para arrancar (la rama activa inicial es WO-desde-Case, que ya existe).

### Historias

**E1-H1 — Generar factura en borrador desde una WO facturable completada**
*Como* usuario de back-office *quiero* generar una factura en borrador a partir de una Work Order
facturable ya completada *para* no re-digitar líneas ni montos.
- **CA1:** Solo WO en estado completado **y** marcadas facturables pueden generar factura.
- **CA2:** La factura nace en estado `DRAFT` con líneas pre-pobladas: servicios + materiales
  consumidos (a precio de venta, nunca costo), cantidad, precio unitario, descuento.
- **CA3:** Hereda cliente, contacto de facturación, moneda y condiciones del origen.
- **CA4:** Una WO ya facturada (con factura no anulada) no puede generar una segunda factura.
- **CA5:** La factura registra su origen (cuál WO) de forma trazable.

**E1-H2 — Editar y completar el borrador**
*Como* back-office *quiero* ajustar el borrador antes de emitir *para* corregir cantidades,
descuentos o impuestos.
- **CA1:** En `DRAFT` se pueden editar líneas, descuentos, impuestos por línea y fecha de
  vencimiento/condiciones.
- **CA2:** Subtotal, impuestos y total se recalculan automáticamente.
- **CA3:** El borrador no tiene número fiscal ni valor contable hasta emitirse.

**E1-H3 — Emitir factura (consecutivo + inmutabilidad)**
*Como* back-office *quiero* emitir la factura *para* dejarla en firme y enviarla al cliente.
- **CA1:** Al emitir, pasa a `ISSUED` y recibe número consecutivo de la serie del tenant.
- **CA2:** La numeración es consecutiva **sin huecos** y única por tenant.
- **CA3:** Una factura `ISSUED` es **inmutable**: ningún campo puede editarse.
- **CA4:** La factura emitida es exportable/visualizable como documento presentable (PDF) para
  enviar al cliente (medio de envío manual; sin integración externa en Fase 1).

**E1-H4 — Anular factura con rastro**
*Como* back-office *quiero* anular una factura emitida errónea *para* corregir sin borrar historia.
- **CA1:** `ISSUED` o `PARTIALLY_PAID` sin pagos aplicados puede pasar a `VOID` con motivo obligatorio.
- **CA2:** `VOID` conserva el número consecutivo (no se reutiliza).
- **CA3:** Al anular, el origen (WO/SO) queda liberado para re-facturarse.
- **CA4:** Una factura con pagos aplicados **no** puede anularse directamente (requiere revertir
  pagos primero — ver E3).

**Notas de alcance:** notas crédito y DIAN NO se construyen; la inmutabilidad de E1-H3 las deja
preparadas. Estados soportados: `DRAFT → ISSUED → PARTIALLY_PAID → PAID / VOID` (los dos de pago
los maneja E3).

---

## E2 — Work Order Facturable

**Objetivo:** dotar a la Work Order del atributo comercial de facturabilidad y de la acumulación
de información necesaria para que E1 genere la factura sin re-digitación.

**Dependencias:** Work Order (ya existe), Price Book (ya existe).

### Historias

**E2-H1 — Marcar facturabilidad según origen**
*Como* coordinador de servicio *quiero* que la WO indique si es facturable *para* distinguir
trabajo cubierto de trabajo cobrable.
- **CA1:** WO con origen Case bajo garantía/contrato → **no facturable** por defecto.
- **CA2:** WO con origen Case sin cobertura → puede marcarse **facturable**.
- **CA3:** La facturabilidad es independiente del estado de ejecución (el técnico ejecuta igual).
- **CA4:** El cambio de facturabilidad queda en el audit log.

**E2-H2 — Acumular líneas cobrables y materiales**
*Como* coordinador *quiero* que la WO acumule lo cobrable durante su vida *para* que la factura
sea fiel a lo ejecutado.
- **CA1:** La WO acumula líneas de servicio con precio (Price Book o acordado).
- **CA2:** Los materiales consumidos en la ejecución se reflejan con cantidad y precio de venta,
  distinguiendo cobrable vs. cubierto.
- **CA3:** Si el negocio cobra por tiempo/visita, las horas registradas en la ejecución quedan
  disponibles como línea cobrable.

**E2-H3 — Aprobar la WO para facturación (checkpoint)**
*Como* back-office con permiso de facturación *quiero* revisar y aprobar la WO completada *para*
evitar facturas erróneas.
- **CA1:** Solo un rol con permiso de facturación puede aprobar (no el técnico).
- **CA2:** La aprobación valida líneas, materiales y montos antes de habilitar E1-H1.
- **CA3:** Una WO facturable completada pero no aprobada no puede generar factura.

---

## E3 — Payments

**Objetivo:** registrar pagos manuales que cierran el lazo de dinero, con parciales y
multi-factura, preparado para pasarelas futuras sin rediseño.

**Dependencias:** E1 (Invoice).

### Historias

**E3-H1 — Registrar un pago aplicado a una factura**
*Como* back-office *quiero* registrar un pago *para* reflejar que el cliente pagó.
- **CA1:** Captura: factura(s) destino, monto, fecha, método (transferencia/efectivo/cheque/
  tarjeta/otro), referencia externa opcional, nota opcional.
- **CA2:** El pago nace en estado `RECORDED` y se aplica de inmediato.
- **CA3:** Si el monto < saldo de la factura → la factura pasa a `PARTIALLY_PAID`.
- **CA4:** Si el monto salda la factura → pasa a `PAID`.
- **CA5:** No se puede aplicar a una factura más que su saldo pendiente.

**E3-H2 — Pago multi-factura**
*Como* back-office *quiero* aplicar un pago a varias facturas del mismo cliente *para* reflejar
el abono global a cuenta.
- **CA1:** Un pago puede distribuirse entre varias facturas abiertas del mismo cliente.
- **CA2:** La suma distribuida no excede el monto del pago.
- **CA3:** Cada factura afectada actualiza su estado y saldo según lo aplicado.

**E3-H3 — Revertir un pago**
*Como* back-office *quiero* revertir un pago erróneo o rebotado *para* corregir sin borrar historia.
- **CA1:** Un pago `RECORDED` puede pasar a `REVERSED` con motivo obligatorio.
- **CA2:** Al revertir, las facturas afectadas recalculan saldo y estado (PAID→PARTIALLY_PAID/ISSUED).
- **CA3:** El pago revertido conserva su rastro (nunca se elimina).

**E3-H4 — Cierre del origen al saldar**
*Como* sistema *quiero* cerrar el origen cuando su factura queda `PAID` *para* reflejar el ciclo
completo.
- **CA1:** Al pasar una factura a `PAID`, su origen (WO o Sales Order) refleja el cierre.

**Notas de alcance:** pasarelas (Wompi/PSE/Mercado Pago) y saldo a favor/sobrepagos NO se
construyen. El método como atributo (E3-H1 CA1) y la referencia externa dejan el camino abierto.

> 🏁 **HITO 1 — CAJA:** con E1+E2+E3 el **Flujo C** queda cerrado punta a punta:
> `Service Request → Case → Work Order → Execution → Invoice → Payment`.

---

## E4 — Revenue Timeline

**Objetivo:** mostrar la historia financiera del cliente en un solo lugar y una cartera mínima.

**Dependencias:** E1, E3.

### Historias

**E4-H1 — Línea de tiempo financiera del cliente**
*Como* usuario comercial/back-office *quiero* ver la historia económica del cliente *para*
responder "¿cómo estamos con este cliente?" sin salir de Nexus.
- **CA1:** En la ficha del cliente se muestra una línea de tiempo cronológica con eventos de los
  tres flujos mezclados (Quote, Sales Order, Work Order, Invoice, Payment).
- **CA2:** Cada evento enlaza a su documento y permite navegar la cadena origen→cobro.
- **CA3:** Cabecera con tres totales: **facturado**, **cobrado**, **saldo pendiente**.

**E4-H2 — Listado de facturas (cartera básica)**
*Como* back-office *quiero* un listado de facturas con estado y saldo *para* saber qué está
abierto y de quién.
- **CA1:** Lista filtrable por estado (`DRAFT/ISSUED/PARTIALLY_PAID/PAID/VOID`) y por cliente.
- **CA2:** Cada fila muestra número, cliente, total, saldo, estado, vencimiento.

**Notas de alcance:** esto es vista **interna**. NO es el Customer Portal (externo, fuera de Fase
1). Edad de cartera avanzada, recordatorios e intereses de mora quedan fuera.

> 🏁 **HITO 2 — VISIBILIDAD.**

---

## E5 — Work Order desde Quote

**Objetivo:** habilitar el segundo origen de la Work Order (Quote), cerrando el Flujo B.

**Dependencias:** Quote (ya existe), E1, E2.

### Historias

**E5-H1 — Generar WO facturable desde una Quote aceptada**
*Como* comercial/coordinador *quiero* que una Quote aceptada genere una Work Order *para* ejecutar
el servicio vendido.
- **CA1:** Una Quote aceptada con líneas de servicio puede generar una Work Order.
- **CA2:** La WO así originada es **facturable por defecto** (precio pre-acordado en la Quote).
- **CA3:** La WO hereda líneas de servicio, precios, cliente y condiciones de la Quote.
- **CA4:** La Quote queda inmutable tras generar la WO.
- **CA5:** La WO registra su origen (cuál Quote) de forma trazable.

**E5-H2 — Caso mixto (productos + servicios en una Quote)**
*Como* comercial *quiero* que una Quote con productos y servicios destine cada línea correctamente
*para* no duplicar ni perder líneas.
- **CA1:** Las líneas de servicio destinan a Work Order; las de producto a Sales Order (E6).
- **CA2:** Ninguna línea queda huérfana ni duplicada; la suma de destinos = total de la Quote.

**E5-H3 — Aprobar trabajo extra no cotizado**
*Como* back-office *quiero* que el trabajo extra en sitio requiera aprobación antes de cobrarse
*para* evitar sorpresas al cliente.
- **CA1:** Líneas no presentes en la Quote original requieren aprobación explícita antes de
  incluirse en la factura.

> 🏁 **HITO 3 — VENTA DE SERVICIO:** Flujo B cerrado (de Opportunity en adelante):
> `Opportunity → Quote → Work Order → Execution → Invoice → Payment`.

---

## E6 — Sales Order

**Objetivo:** representar el compromiso comercial confirmado de venta de producto, cerrando el
Flujo A.

**Dependencias:** Quote (ya existe), E1.

### Historias

**E6-H1 — Generar Sales Order desde Quote aceptada**
*Como* comercial *quiero* convertir una Quote aceptada en Sales Order *para* confirmar el pedido.
- **CA1:** Una Quote aceptada con líneas de producto genera una Sales Order en estado `CONFIRMED`.
- **CA2:** Hereda cliente, líneas de producto, precios, descuentos, moneda y condiciones.
- **CA3:** La Quote queda inmutable tras generar la Sales Order.
- **CA4:** En caso mixto, convive con la Work Order generada (E5-H2) sin duplicar líneas.

**E6-H2 — Avanzar el ciclo de cumplimiento**
*Como* operaciones *quiero* mover la Sales Order por su ciclo *para* reflejar la entrega.
- **CA1:** Estados: `CONFIRMED → IN_FULFILLMENT → DELIVERED → CLOSED`, con `CANCELLED` antes de
  facturar.
- **CA2:** `IN_FULFILLMENT` es opcional (negocios simples pueden saltar a `DELIVERED`).
- **CA3:** Solo `DELIVERED` habilita la facturación.

**E6-H3 — Facturar la Sales Order entregada**
*Como* back-office *quiero* facturar una Sales Order entregada *para* cobrar la venta.
- **CA1:** Una Sales Order `DELIVERED` genera factura (rama Sales-Order de E1).
- **CA2:** La Sales Order conoce cuánto de su valor fue facturado (saldo por facturar).
- **CA3:** Al saldarse la factura, la Sales Order pasa a `CLOSED` (vía E3-H4).
- **CA4 (opcional, postergable):** facturación parcial de entregas parciales. *Si complica el
  MVP, se exige facturación total y se difiere — sin rediseño.*

> 🏁 **HITO 4 — VENTA DE PRODUCTO:** Flujo A cerrado (de Opportunity en adelante):
> `Opportunity → Quote → Sales Order → Invoice → Payment`.

---

## E7 — Leads

**Objetivo:** cerrar el embudo por arriba en los Flujos A y B. *(Dominio Sales; puede ejecutarse
en paralelo a E1–E6.)*

**Dependencias:** Opportunity (ya existe).

### Historias

**E7-H1 — Capturar un Lead**
*Como* comercial *quiero* registrar un prospecto *para* gestionar demanda antes de calificarla.
- **CA1:** Captura mínima: nombre/empresa, contacto, fuente, estado de calificación.
- **CA2:** El Lead vive en el dominio Sales junto a Opportunity.

**E7-H2 — Convertir Lead en Opportunity**
*Como* comercial *quiero* convertir un Lead calificado en Opportunity *para* iniciar el ciclo de
venta.
- **CA1:** La conversión crea (o vincula) Account/Contact y genera la Opportunity.
- **CA2:** El Lead queda marcado como convertido, conservando trazabilidad hacia la Opportunity.
- **CA3:** Un Lead convertido no se reconvierte.

**Notas de alcance:** scoring, nurturing y automatización de Leads quedan **fuera** (sobre-modelar
sería prematuro). Solo captura + conversión.

> 🏁 **HITO 5 — EMBUDO COMPLETO:** Flujos A y B cerrados desde su primer nodo (Lead).

---

## Cierre — Verificación de éxito de Fase 1

La Fase 1 está completa cuando los tres flujos se ejecutan de punta a punta dentro de Nexus:

- **A:** `Lead → Opportunity → Quote → Sales Order → Invoice → Payment` ✅
- **B:** `Lead → Opportunity → Quote → Work Order → Execution → Invoice → Payment` ✅
- **C:** `Service Request → Case → Work Order → Execution → Invoice → Payment` ✅

…sin sistemas externos, sin Excel, sin procesos manuales fuera de Nexus, con trazabilidad total
origen→cobro y numeración fiscal consecutiva.

*Las capacidades fuera de alcance (DIAN, AI Gateway, Analytics Operativo, Forecasting, Customer
Portal, Integraciones avanzadas) permanecen diseñadas y visibles en la visión, y se retoman solo
una vez completada Revenue Operations.*
