# NEXUS — Product Capability Map

> **Audiencia:** Producto · Ventas · Inversionistas · Clientes piloto
> **Fecha:** 2026-06-10 · **Estado:** Vivo (se actualiza por trimestre)
> **Documento hermano:** `PRODUCT-VISION-FREEZE.md` (congelado — define la identidad; este mapa
> traduce esa identidad a capacidades visibles y secuenciadas).

Este mapa NO reduce Nexus. Secuencia su evolución. Cada capacidad futura tiene su "enchufe"
arquitectónico previsto; lo que cambia es *cuándo* se energiza, no *si* existirá.

---

## Leyenda de estados

| Estado | Significado | ¿Se invierte desarrollo hoy? |
|---|---|---|
| 🟢 **AVAILABLE NOW** | Existe y funciona en producto. | Mantenimiento. |
| 🔵 **IN ACTIVE DEVELOPMENT** | Se construye ya. Cierra `Demand → Execution → Revenue`. | Sí, foco total. |
| 🟡 **DESIGNED / COMING SOON** | Dominio + UX definidos. Demostrable en roadmap comercial. NO se codifica aún. | No (solo diseño). |
| ⚪ **FUTURE VISION** | Etapa posterior. Costura prevista, sin recursos asignados. | No. |

Prioridad rectora: **Customer Demand → Execution → Revenue.**

---

## 1. Tabla completa de clasificación

| Capacidad | Estado | Justificación | Dependencias | Valor comercial | Valor inversionista | Riesgo si se construye antes de tiempo |
|---|---|---|---|---|---|---|
| **Opportunities** | 🟢 | Embudo comercial operativo. | — | Alto | Medio | — (ya hecho) |
| **Quotes** | 🟢 | Cotización con revisiones y líneas; es la bisagra de la visión. | Products, Price Book | Alto | Alto | — (ya hecho) |
| **Cases** | 🟢 | Tickets de servicio con SLA y numeración atómica. Origen del Flujo C. | — | Alto | Alto | — (ya hecho) |
| **Assets** | 🟢 | Equipos con jerarquía, criticidad, garantías. | — | Medio | Medio | — (ya hecho) |
| **Work Orders** | 🟢 | Órdenes de trabajo operativas (hoy nacen de Case). | Cases, Technicians | Alto | Alto | — (origen polimórfico en desarrollo) |
| **Scheduling** | 🟢 | Asignación técnico↔orden con fechas. | Work Orders, Technicians | Medio | Medio | — (ya hecho) |
| **Dispatch** | 🟢 | Board con drag-and-drop + carga de técnicos. | Scheduling | Medio | Medio | Profundizar más = resolver problema de cliente 50+ técnicos que aún no existe. |
| **Technicians** | 🟢 | Roster + estadísticas. | — | Medio | Medio | — (ya hecho) |
| **Inventory** (consumo básico) | 🟢 | Ledger de materiales operativo. | Materials | Medio | Medio | Activar valoración FIFO/LIFO avanzada = WMS prematuro. |
| **Invoicing** | 🔵 | **Cierre de caja. Convergencia de los 3 flujos. Sin esto Nexus no cobra.** | Sales Order, Work Order | **Crítico** | **Crítico** | Riesgo es NO construirlo. Único riesgo: diseñarla no-polimórfica. |
| **Payments** (registro) | 🔵 | Completa el lazo de dinero. Registro manual primero. | Invoicing | **Crítico** | **Crítico** | Atar a una pasarela específica antes de tiempo (usar puerto abstracto). |
| **Sales Orders** | 🔵 | Rama comercial de la Quote (Flujo A) y base de la rama B. | Quotes | Alto | Alto | Bajo — es entidad de cierre, no de exploración. |
| **Leads** | 🔵 | Cierra el embudo por arriba; alimenta demanda. | Opportunities | Alto | Medio | Bajo. Sobre-modelar scoring/nurture sería prematuro. |
| **AI** (gateway + 1 caso) | 🔵 | Vuelve a Nexus AI-native en arquitectura. Implementar 1 caso de ejecución (triage de Case / sugerencia en WO). | AI Gateway | Alto | **Alto** | Construir IA decorativa (forecasting) en vez de IA operativa. |
| **Analytics** (operativo) | 🔵 | Ejecutado / facturado / cobrado. Sensación de control que sostiene renovación. | Invoicing, Work Orders | Alto | Alto | Optimizar a escala (event store) antes de tener volumen. |
| **Integrations** (DIAN + WhatsApp/email) | 🔵 | Facturación electrónica = foso + regulación. Notificaciones = obligatorio LATAM. | Invoicing | Alto | Alto | Construir conectores genéricos (ERP, Zapier) sin cliente que los pida. |
| **Customer Portal** | 🟡 | Demanda pura del cliente final; diferenciador B2B. No puede mostrar lo que aún no se factura. | Invoicing, Work Orders | Alto | Alto | Construir portal sobre datos de caja inexistentes. |
| **Public API** | 🟡 | Habilitador de ecosistema. Exponer contratos antes de madurarlos los congela. | Dominios estables | Medio | Alto | Congelar contratos inmaduros; atarse las manos para iterar. |
| **Contracts** (mantenimiento) | 🟡 | Tercer origen de la Work Order; convierte a Nexus en motor de ingreso recurrente del cliente. | Work Orders, Invoicing | Alto | **Alto** | Recurrencia + SLA + facturación periódica = gran complejidad sin tracción. |
| **Forecasting** | ⚪ | Prototipo IA existe, pero predice sobre datos vacíos. Upsell post-tracción. | Analytics histórico | Bajo (hoy) | Medio | Analítica que adivina sin historia; clásico "feature correcta, momento equivocado". |
| **Knowledge Base** | ⚪ | Soporte de autoservicio y base para IA de resolución. Valiosa, no urgente. | Cases, AI | Bajo (hoy) | Medio | Curar contenido sin base de usuarios que lo consuma. |

---

## 2. Mapa visual del producto

```
                          NEXUS — CAPABILITY MAP
        Customer Demand ───────► Execution ───────► Revenue

┌─ SALES ───────────────┐  ┌─ SERVICE (incl. Field) ─┐  ┌─ REVENUE OPS ──────────┐
│ 🟢 Opportunities       │  │ 🟢 Cases                 │  │ 🔵 Invoicing  ◄── caja  │
│ 🟢 Quotes  ◄ bisagra   │  │ 🟢 Assets                │  │ 🔵 Payments             │
│ 🔵 Sales Orders        │  │ 🟢 Work Orders           │  │ 🟢 Inventory (básico)   │
│ 🔵 Leads               │  │ 🟢 Scheduling            │  │ 🔵 Analytics (operativo)│
│                        │  │ 🟢 Dispatch              │  │ 🔵 AI (gateway + 1 caso)│
│                        │  │ 🟢 Technicians           │  │ 🔵 Integrations (DIAN)  │
└────────────────────────┘  └──────────────────────────┘  └─────────────────────────┘

        ── DESIGNED / COMING SOON (visibles en demo y roadmap) ──
        🟡 Customer Portal    🟡 Public API    🟡 Contracts

        ── FUTURE VISION (norte estratégico, sin desarrollo) ──
        ⚪ Forecasting        ⚪ Knowledge Base

   WORK ORDER — ORIGEN POLIMÓRFICO:
   [Quote] ──┐
   [Case] ───┼──► WORK ORDER ──► Dispatch ──► Technician ──► Execution
   [Contract]┘                                              └─► Material ─► INVOICE ─► PAYMENT
   (🟡 futuro)        un solo punto de cobro para los 3 orígenes ▲
```

**Lectura del mapa:** los tres dominios ya tienen masa crítica en 🟢; el trabajo 🔵 actual es
casi todo el lado **Revenue** (cerrar la caja) más los dos eslabones de **Demand/Execution** que
lo alimentan (Leads, AI operativa, Analytics). Lo 🟡 y ⚪ es horizonte vendible, no carga de obra.

---

## 3. Roadmap visible para clientes

> Mensaje al cliente piloto: *"Nexus ya opera tu servicio y tu campo hoy. En las próximas
> semanas cierra tu ciclo de cobro. Y esto es hacia dónde va."*

**HOY YA PUEDES (Available Now)**
- Gestionar oportunidades, cotizaciones y catálogo de productos/precios.
- Recibir y atender casos de servicio con SLA.
- Crear órdenes de trabajo, asignar técnicos, despachar y ejecutar en campo.
- Registrar consumo de materiales y controlar inventario operativo.

**PRÓXIMAMENTE — ESTE TRIMESTRE (In Active Development)**
- Facturar tu trabajo (venta o servicio) desde una sola pantalla.
- Registrar pagos y ver cuánto ejecutaste, facturaste y cobraste.
- Convertir leads en oportunidades.
- Asistencia con IA en la operación (clasificación de casos / sugerencias en órdenes).
- Facturación electrónica (DIAN) y notificaciones por WhatsApp/email.

**EN CAMINO (Designed / Coming Soon)**
- Portal para que tus clientes vean su servicio y sus facturas.
- Contratos de mantenimiento con visitas programadas.
- Conexión con tus otras herramientas (API).

**VISIÓN (Future Vision)**
- Pronósticos de ingreso asistidos por IA.
- Base de conocimiento y autoservicio.

---

## 4. Roadmap visible para inversionistas

> Tesis: Nexus ocupa una casilla que nadie llena —venta B2B consultiva + ejecución de campo +
> inventario + facturación localizada— para el mercado medio latinoamericano. El riesgo
> restante es de **ejecución**, no de posicionamiento.

**FASE 1 — CERRAR EL LAZO DE DINERO (0–3 meses) · *de-risking comercial***
Invoicing + Payments + Sales Orders + Leads + IA operativa + Analytics + DIAN.
→ *Hito:* primeros clientes piloto que van de demanda a pago cobrado en los 3 flujos.
→ *Prueba para el VC:* Nexus genera revenue verificable, no solo ejecuta trabajo.

**FASE 2 — RETENCIÓN Y EXPANSIÓN (3–9 meses) · *de-risking de churn***
Customer Portal + Contracts (ingreso recurrente del cliente) + Public API + pasarela de pagos.
→ *Hito:* NRR > 100%; ingreso recurrente vía contratos de mantenimiento.
→ *Prueba para el VC:* foso (facturación localizada + portal) y expansión de cuenta.

**FASE 3 — PLATAFORMA Y ECOSISTEMA (9–18 meses) · *de-risking de escala***
Forecasting/IA predictiva como upsell premium + Knowledge Base + ecosistema de integraciones +
capacidades de escala (eventos, observabilidad).
→ *Hito:* Nexus como plataforma extensible con marketplace de integraciones.
→ *Prueba para el VC:* defensibilidad de plataforma y palancas de pricing premium.

**Por qué este orden convence a un VC:** cada fase elimina un riesgo distinto en el orden correcto
—primero "¿cobra?", luego "¿retiene y expande?", luego "¿escala como plataforma?"—. Construir IA
predictiva o ecosistema antes de probar revenue sería gastar capital en de-risking de etapa
equivocada.

---

## 5. Recomendación final

**Adoptar este Capability Map como la vista oficial de evolución de Nexus**, subordinada a
`PRODUCT-VISION-FREEZE.md`.

Tres razones, en las tres voces:

- **Founder / Product Strategist:** el mapa permite *vender el futuro sin construirlo hoy*. Los
  estados 🟡 y ⚪ son demostrables en roadmap comercial y narrativa de inversión, mientras el
  desarrollo se concentra en el único bucket que importa ahora (🔵 = cerrar la caja). Esto resuelve
  la tensión real del proyecto: parecer una plataforma moderna y ambiciosa sin diluir el foco.

- **Enterprise SaaS Architect:** ninguna capacidad futura se "elimina"; cada una tiene su costura
  prevista (IA como gateway, Pagos como puerto, Work Order con origen polimórfico listo para
  Contract, API como contratos internos estables). Energizar un enchufe después será aditivo, no
  refactor. La integridad de la visión moderna queda intacta.

- **VC Partner:** la secuencia de-risking (cobra → retiene → escala) es exactamente la que un
  inversionista quiere ver. El mapa comunica ambición de plataforma con disciplina de ejecución
  —la combinación que distingue una empresa financiable de un proyecto de ingeniería impresionante.

**Condición:** este mapa solo crea valor si se respeta la frontera de inversión. Mostrar 🟡/⚪ a
clientes e inversionistas es legítimo; *desviar desarrollo* hacia ellos antes de cerrar la Fase 1
no lo es. La diferencia entre secuenciar y dispersarse es esa línea.

---

*Documento vivo. Las capacidades migran de estado por trimestre conforme se cumplen hitos.
La identidad (qué es Nexus, sus 3 dominios y 3 flujos) permanece congelada en el documento hermano.*
