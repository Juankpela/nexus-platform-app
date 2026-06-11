# NEXUS — Revenue Operations: Especificación Funcional

> **Tipo:** Especificación funcional y de producto (sin arquitectura técnica, sin BD, sin endpoints)
> **Fecha:** 2026-06-10 · **Estado:** Propuesta para aprobación
> **Documentos rectores:** `PRODUCT-VISION-FREEZE.md` (identidad congelada) ·
> `PRODUCT-CAPABILITY-MAP.md` (secuenciación) · Vision Coverage Audit (aprobada)
>
> **Premisa aprobada:** Invoice es el bloqueador maestro de los tres flujos. Esta épica define
> la última gran pieza para que Nexus pase de *Execution* a *Revenue*.

---

## 0. Principio rector de toda la épica

**Un solo punto de cobro.** Los tres flujos (A, B, C) divergen en cómo nace el trabajo, pero
convergen en una sola Invoice y un solo registro de Payment. Cualquier decisión de diseño que
cree dos formas de facturar o dos formas de cobrar viola la visión congelada y se rechaza.

---

## 1. SALES ORDER

### Propósito
La Sales Order es el **compromiso comercial confirmado**: el punto donde una Quote aceptada se
convierte en obligación de entrega. Separa dos momentos que la Quote confunde si se usa sola:
*"esto es lo que te propongo"* (Quote, negociable, con revisiones) vs. *"esto es lo que acordamos
y te voy a entregar"* (Sales Order, firme, base de facturación).

### Cuándo existe y cuándo no
- **Existe** en el Flujo A (venta de producto): toda venta de producto pasa por Sales Order antes
  de facturarse. Es el objeto que representa el pedido confirmado y su cumplimiento (entrega).
- **NO existe** en los Flujos B y C: cuando lo vendido es un servicio, el compromiso de ejecución
  es la **Work Order**, no una Sales Order. Crear ambas sería duplicar el mismo compromiso en dos
  objetos — burocracia tipo Salesforce que la visión explícitamente rechaza.
- **Caso mixto (Quote con productos Y servicios):** la Quote puede generar **ambas** a la vez —
  una Sales Order por las líneas de producto y una Work Order por las líneas de servicio. Cada
  línea de la Quote se destina a uno u otro destino; ninguna línea queda huérfana ni duplicada.

### Relación con Quote
- Nace **solo** desde una Quote aceptada (no hay Sales Orders manuales sin Quote; si la venta es
  directa, se crea una Quote y se acepta en el mismo acto — el rastro comercial nunca se rompe).
- Hereda de la Quote: cliente, líneas (producto, cantidad, precio, descuentos), moneda, condiciones.
- La Quote queda **inmutable** al generar la Sales Order. Cambios posteriores = nueva revisión de
  Quote → nueva Sales Order (o ajuste vía nota crédito si ya se facturó).

### Ciclo de vida y estados
```
CONFIRMED ──► IN_FULFILLMENT ──► DELIVERED ──► CLOSED
    │                                │
    └──────────► CANCELLED ◄─────────┘ (antes de facturar)
```
| Estado | Significado | Regla clave |
|---|---|---|
| `CONFIRMED` | Pedido aceptado, pendiente de cumplimiento. | Estado inicial al crearse desde Quote. |
| `IN_FULFILLMENT` | En preparación/entrega. | Opcional saltarlo en negocios simples. |
| `DELIVERED` | Entregado al cliente. | **Habilita facturación.** |
| `CLOSED` | Facturada y completada. | Cierre automático al pagarse su Invoice. |
| `CANCELLED` | Anulada antes de facturar. | Si ya hay Invoice emitida → se anula vía Invoice, no aquí. |

### Relación con Invoice
- Una Sales Order `DELIVERED` puede facturarse **completa o parcialmente** (entregas parciales →
  facturas parciales, sumando nunca más del total de la orden).
- La Invoice referencia a la Sales Order como su **origen**; la Sales Order conoce cuánto de su
  valor ya fue facturado (saldo por facturar).

---

## 2. WORK ORDER FACTURABLE

### Qué significa "facturable"
Una Work Order facturable es aquella cuya ejecución **genera derecho a cobro**. La facturabilidad
NO es un estado del trabajo (el trabajo se ejecuta igual); es un **atributo comercial** que
responde: *"cuando esto termine, ¿se le cobra al cliente?"*. Separar ambas cosas es la decisión
de producto más importante de esta sección: el técnico ejecuta sin saber ni decidir de cobros;
la facturabilidad la determina el origen y la aprueba la oficina.

### Cuándo se vuelve facturable (regla congelada en la visión)
| Origen de la WO | Facturabilidad | Por qué |
|---|---|---|
| **Quote** (Flujo B) | **Siempre facturable** desde su creación. | Nace de una venta: el precio ya fue cotizado y aceptado. |
| **Case bajo garantía/contrato** (Flujo C) | **No facturable.** | El cobro ya ocurrió (venta original o contrato). Facturarla sería doble cobro. |
| **Case sin cobertura** (Flujo C) | **Facturable**, marcada al crearla o antes de cerrarla. | Correctivo fuera de garantía: el cliente paga por el servicio puntual. |
| **Contract** (futuro) | Según el contrato (cubierto / extra). | Se define cuando exista Contract; el diseño lo deja previsto. |

### Quién la aprueba
- **La marca** quien crea la WO (dispatcher/coordinador de servicio), proponiendo facturable sí/no
  según cobertura.
- **La aprueba para facturación** un rol de back-office con permiso de facturación (no el técnico),
  al revisar la WO completada: valida materiales consumidos, horas y montos **antes** de generar la
  Invoice. Este checkpoint humano es deliberado en el MVP: evita facturas erróneas y reemplaza
  reglas automáticas que aún no se pueden calibrar.

### Qué información debe acumular una WO facturable
Para que la Invoice se genere sin re-digitación, la WO debe acumular durante su vida:
1. **Líneas de servicio**: qué trabajo se cobra (desde la Quote si origen B; definidas por la
   oficina si origen C) con precio del Price Book o precio acordado.
2. **Materiales consumidos**: lo registrado en Material Consumption durante la ejecución, con
   cantidad y precio de venta (no costo) — distinguiendo material cobrable vs. cubierto.
3. **Tiempo/visitas** (si el negocio cobra por hora o por visita): horas registradas en Execution.
4. **Evidencia de conformidad**: la ejecución completada (fotos, notas, firma futura) que respalda
   el cobro ante disputa.
5. **Moneda y condiciones** heredadas de la Quote (origen B) o del cliente (origen C).

### Diferencias clave: WO desde Quote vs. WO desde Case
| Dimensión | WO desde Quote (B) | WO desde Case (C) |
|---|---|---|
| Precio | Pre-acordado en la Quote; la WO no negocia. | Se define al marcarla facturable (tarifa estándar o cotización rápida). |
| Facturabilidad | Implícita y total. | Explícita y condicionada a cobertura. |
| Alcance | Definido por las líneas de la Quote. | Definido por el diagnóstico del Case. |
| Relación comercial | Cierra una venta (alimenta pipeline ganado). | Atiende post-venta (alimenta historial de servicio). |
| Variaciones en sitio | Trabajo extra no cotizado → requiere aprobación antes de cobrarse (anti-sorpresa). | El alcance puede crecer con el diagnóstico; la oficina aprueba el monto final. |

---

## 3. INVOICE (polimórfica)

### Diseño
Una sola Invoice con **un origen entre tres**, mutuamente excluyente:
1. **Sales Order** (Flujo A)
2. **Work Order originada desde Quote** (Flujo B)
3. **Work Order originada desde Case** (Flujo C)

Toda Invoice tiene **exactamente un origen**. No existen facturas huérfanas (sin origen) en el MVP
— la trazabilidad demanda→cobro es total. (Las facturas libres/manuales, si el mercado las exige,
serían una enmienda futura explícita.)

### Información común a todos los escenarios (el "núcleo invariante")
Independiente del origen, toda Invoice contiene:
- Cliente (Company) y contacto de facturación.
- Numeración consecutiva propia (serie de facturación del tenant).
- Líneas: descripción, cantidad, precio unitario, descuento, impuestos por línea.
- Subtotal, impuestos, total; moneda.
- Fechas: emisión, vencimiento; condiciones de pago.
- Referencia a su origen (cuál Sales Order o cuál Work Order).
- Saldo: total − pagos aplicados.

**Lo que varía por origen es solo *de dónde nacen las líneas***: de las líneas entregadas de la
Sales Order (A), de las líneas de servicio + materiales de la WO (B y C). Una vez emitida, la
Invoice es idéntica en comportamiento en los tres casos. Esta es la materialización del principio
"un solo punto de cobro".

### Estados
```
DRAFT ──► ISSUED ──► PARTIALLY_PAID ──► PAID
            │              │
            └──► VOID ◄────┘ (anulación; ver reglas)
```
| Estado | Significado | Regla clave |
|---|---|---|
| `DRAFT` | Generada desde el origen, editable, sin valor fiscal. | Aquí ocurre la revisión humana del MVP. |
| `ISSUED` | Emitida al cliente. **Inmutable** desde este momento. | Toda corrección posterior = anulación o nota crédito. |
| `PARTIALLY_PAID` | Con pagos aplicados < total. | Derivado de Payments, no manual. |
| `PAID` | Saldada. | Cierra el lazo; dispara cierre del origen. |
| `VOID` | Anulada. | Conserva número y rastro (nunca se borra). |

### Reglas congeladas
1. **Inmutabilidad post-emisión.** Una Invoice `ISSUED` jamás se edita. Es la regla que protege la
   confianza contable y habilita la facturación electrónica futura (DIAN exige exactamente esto).
2. **Anulación con rastro.** `VOID` requiere motivo, conserva el consecutivo, y libera al origen
   para re-facturarse. Solo permitida si no tiene pagos aplicados (con pagos → nota crédito futura
   o reverso del pago primero).
3. **Numeración consecutiva sin huecos** por tenant — requisito fiscal LATAM, no negociable.
4. **El origen gobierna el contenido inicial; la oficina ajusta en DRAFT; la emisión congela.**

### Notas crédito (futuras — diseñadas, no construidas)
El diseño las prevé como **documento separado** que referencia a una Invoice emitida y ajusta su
saldo (devoluciones, descuentos post-emisión, correcciones). No se construyen en el MVP, pero la
regla de inmutabilidad de la Invoice se congela *ahora* precisamente para que las notas crédito
encajen después sin rediseño: si las facturas fueran editables, las notas crédito nunca tendrían
lugar natural.

---

## 4. PAYMENT

### Registro manual inicial (MVP)
El Payment del MVP es un **registro de hecho consumado**: alguien de back-office anota que el
cliente pagó. Captura: factura(s) a la que aplica, monto, fecha, método (transferencia, efectivo,
cheque, tarjeta, otro), referencia (número de transacción/consignación) y nota opcional.

### Estados
```
RECORDED ──► (aplicado a Invoice) 
    │
    └──► REVERSED (reverso con motivo; nunca se borra)
```
Deliberadamente simple: un pago registrado se aplica de inmediato. `REVERSED` cubre el error
humano (se registró mal) y el rebote bancario, conservando rastro. No hay estados intermedios
(`PENDING`, `PROCESSING`) en el registro manual — esos estados pertenecen al mundo de pasarelas
y se incorporan después (ver abajo) sin afectar lo construido.

### Pagos parciales y completos
- Un pago puede ser **menor** al saldo de la Invoice → la Invoice pasa a `PARTIALLY_PAID` y su
  saldo disminuye.
- Varios pagos pueden aplicarse a la misma Invoice hasta saldarla → `PAID`.
- Un pago puede **cubrir varias facturas** del mismo cliente (el cliente consigna un monto global)
  → el registro permite distribuir el monto entre facturas abiertas. Esto es práctica universal en
  LATAM (el cliente "abona a su cuenta") y omitirlo obligaría a registros ficticios.
- Sobrepago: el excedente queda como **saldo a favor del cliente**, aplicable a futuras facturas.
  (Diseñado; puede postergarse si complica el MVP — ver Riesgos.)

### Preparado para Wompi / PSE / Mercado Pago (sin rediseño)
La clave de diseño funcional: **el Payment registra el hecho del pago; el *medio* por el que llegó
es un detalle del registro, no un tipo de Payment distinto.** Reglas que lo garantizan:
1. El método de pago es un atributo abierto (lista extensible), no una rama del modelo.
2. Todo pago tiene espacio para una **referencia externa** (hoy: número de consignación manual;
   mañana: ID de transacción de Wompi/PSE/Mercado Pago). El campo es el mismo.
3. Cuando lleguen las pasarelas, lo que se agrega es un **origen automático del registro** (la
   pasarela notifica y el pago se registra solo, con estados previos de procesamiento) — pero el
   Payment resultante es indistinguible del manual: mismo objeto, misma aplicación a facturas,
   mismo efecto en saldos. La conciliación y el timeline no cambian.
4. Nada en Invoice sabe *cómo* se pagó; solo sabe *cuánto* se ha aplicado. Ese desacople es lo
   que hace el futuro aditivo.

---

## 5. CUSTOMER REVENUE TIMELINE

### Qué es
La vista cronológica de **toda la historia económica de un cliente** en un solo lugar: qué se le
propuso, qué se le vendió, qué se le ejecutó, qué se le facturó y qué ha pagado. Es la respuesta
de Nexus a la pregunta que toda PYME responde hoy juntando Excel + correo + memoria: *"¿cómo
estamos con este cliente?"*

### Cómo se ve (estructura funcional)
En la ficha del cliente (Company), una línea de tiempo unificada con eventos de los tres flujos
mezclados cronológicamente, cada uno enlazando a su documento:

```
ACME S.A.S. — Revenue Timeline                    Resumen: Facturado $48.2M · Cobrado $41.0M · Saldo $7.2M

  05 Jun  💰 Payment $3.5M aplicado a INV-0042 ········· INV-0042: PAGADA
  02 Jun  🧾 Invoice INV-0043 emitida ($7.2M) ◄─ WO-0118 (correctivo sin garantía)   VENCE 02 JUL
  28 May  🔧 WO-0118 ejecutada (Case CS-0301: falla compresor) — facturable
  25 May  📋 Case CS-0301 abierto (solicitud de servicio)
  20 May  🧾 Invoice INV-0042 emitida ($3.5M) ◄─ SO-0021
  18 May  📦 Sales Order SO-0021 entregada
  10 May  ✅ Quote Q-0089 aceptada → SO-0021 (productos) + WO-0112 (instalación)
  02 May  📄 Quote Q-0089 enviada ($12.8M)
```

### Reglas funcionales
1. **Cada evento enlaza la cadena completa**: desde una Invoice se navega a su WO o Sales Order,
   y de ahí a la Quote/Case que la originó. La trazabilidad de la visión, hecha visible.
2. **Cabecera con los tres números que importan**: facturado, cobrado, saldo pendiente (y, fase 2,
   vencido). Es el "estado de cuenta" del cliente.
3. **Los tres flujos conviven en la misma línea de tiempo** — el cliente no sabe ni le importa si
   internamente fue Flujo A, B o C; ve una sola relación comercial. Nexus tampoco los separa aquí.
4. Esta vista es, además, la **semilla del Customer Portal** (capability 🟡): el portal será un
   subconjunto read-only de este timeline. Diseñarlo bien aquí paga dos veces.

---

## 6. PRIORIZACIÓN

| Orden | Pieza | Justificación |
|---|---|---|
| **1º** | **Invoice + WO facturable (origen Case)** | Juntas desbloquean el Flujo C, que está al 65% y es el camino más corto a caja. La Invoice se construye polimórfica desde el día 1 (su contrato acepta los 3 orígenes) aunque su primer origen activo sea la WO-desde-Case. La marca de facturabilidad en WO es pequeña y es prerequisito de su facturación. |
| **2º** | **Payment (registro manual)** | Cierra el lazo del Flujo C completo: `Case → WO → Execution → Invoice → Payment`. **Hito: primer flujo oficial 100% operativo.** Huella Global puede cobrar. |
| **3º** | **WO con origen Quote** | Extiende lo ya construido (WO + Invoice ya existen) al Flujo B. Es el paso más barato por valor desbloqueado: convierte la venta de servicios en flujo completo. |
| **4º** | **Sales Order** | Completa el Flujo A. Va al final no por menor importancia sino por menor urgencia: los clientes objetivo (empresas de servicio) viven de B y C; A se vuelve crítico al vender producto puro o mixto. Leads queda fuera de esta épica (pertenece a Sales, no a Revenue Ops; se construye en paralelo o después sin bloquear nada). |

**Lógica de la secuencia:** maximizar flujos cerrados por unidad de esfuerzo. C primero (menos
faltante), B segundo (reusa todo), A tercero (una entidad nueva). Cada paso entrega un flujo
completo y demostrable — nunca tres flujos a medias.

---

## 7. MVP DE REVENUE OPERATIONS (criterio: Huella Global opera y cobra)

Conjunto mínimo para que Huella Global —cliente piloto— gestione y cobre su operación real:

**Dentro del MVP:**
1. Marcar una Work Order como facturable (con su precio) — origen Case y origen Quote.
2. Generar Invoice en borrador desde una WO completada o una Sales Order entregada, con líneas
   pre-pobladas (servicios + materiales consumidos).
3. Revisar/ajustar el borrador y **emitir** (numeración consecutiva, inmutable, PDF presentable
   para enviar al cliente).
4. Registrar pagos manuales (totales, parciales, multi-factura) y ver saldos actualizados.
5. Anular facturas con motivo y rastro.
6. Customer Revenue Timeline básico en la ficha del cliente (facturado / cobrado / saldo + eventos).
7. Listado de facturas con estados y saldos (la "cartera" mínima: qué está abierto y de quién).

**Explícitamente FUERA del MVP** (diseñado, no construido):
- Facturación electrónica DIAN (fase inmediatamente siguiente; la inmutabilidad y el consecutivo
  ya la preparan).
- Notas crédito.
- Pasarelas de pago (Wompi/PSE/Mercado Pago).
- Saldo a favor / sobrepagos (si retrasa el MVP).
- Recordatorios de cobro automáticos, intereses de mora, edad de cartera avanzada.
- Multi-moneda avanzada (el MVP opera en COP; el diseño no impide monedas futuras).

**Definición de éxito del MVP:** Huella Global recibe una solicitud de servicio, despacha un
técnico, ejecuta, factura ese trabajo y registra el pago **sin salir de Nexus ni usar Excel**.

---

## 8. RIESGOS

### Decisiones que generarían refactor futuro si se toman mal HOY
| Riesgo | Decisión que lo evita |
|---|---|
| Invoice editable después de emitida | **Inmutabilidad post-emisión desde el día 1.** Retrofittear inmutabilidad sobre facturas editadas es una pesadilla contable y bloquea DIAN. |
| Invoice mono-origen ("solo factura WO") y luego "agregarle" Sales Order | Contrato polimórfico desde el día 1, aunque el primer origen activo sea uno solo. |
| Acoplar Payment a un método/pasarela específico | Payment registra el hecho; el medio es un atributo. Pasarelas = origen automático futuro del mismo objeto. |
| Numeración de facturas no consecutiva o reutilizable | Consecutivo fiscal por tenant, sin huecos, con anulación que conserva número. |
| Precios de venta de materiales tomados del costo de inventario | Las líneas de Invoice llevan **precio de venta** (Price Book / acordado), nunca el costo del ledger. Mezclarlos contamina ambos mundos. |
| Pago atado a una sola factura | Aplicación multi-factura desde el diseño (la práctica LATAM lo exige; cambiarlo después rompe la conciliación histórica). |

### Decisiones que deben CONGELARSE ahora
1. Invoice polimórfica con exactamente un origen — sin facturas huérfanas en el MVP.
2. Inmutabilidad de Invoice emitida; correcciones solo vía anulación / nota crédito futura.
3. Facturabilidad de la WO determinada por su origen (regla de la visión congelada).
4. Separación ejecución/cobro: el técnico ejecuta, la oficina factura.
5. Un solo registro de Payment para manual y pasarelas futuras.
6. Numeración consecutiva fiscal por tenant.

### Decisiones que pueden POSTERGARSE sin costo
1. Notas crédito (la inmutabilidad ya les reserva el lugar).
2. Pasarelas de pago y sus estados de procesamiento.
3. Saldo a favor / manejo de sobrepagos.
4. Facturación parcial de Sales Orders (el MVP puede exigir facturación total y abrir parciales después).
5. Impuestos complejos (retenciones, regímenes especiales) — el MVP soporta IVA simple por línea;
   el diseño deja los impuestos como líneas calculadas, extensibles.
6. Multi-moneda operativa.

---

## Cierre

Esta especificación completa la mitad ausente de Nexus. Con ella, los tres flujos de la visión
congelada quedan definidos de punta a punta: el trabajo ya sabía ejecutarse; ahora sabe cobrarse.
La épica no agrega ambición nueva — convierte la ambición ya aprobada en operación cobrable, en
el orden exacto que la auditoría de cobertura demostró: **C, luego B, luego A.**
