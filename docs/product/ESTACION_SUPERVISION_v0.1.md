# Estación de Supervisión Operacional — Experiencia de Trabajo (v0.1)

> **Naturaleza.** Diseña la **experiencia de trabajo** de un Supervisor Operacional cuyo único objetivo es **preservar valor antes del punto de no retorno**. No es visual, ni mockup, ni código — primero la experiencia; el visual es fácil si la experiencia es correcta. **No es un dashboard.** Imaginamos que la palabra "dashboard" nunca existió: esto es un **puesto de trabajo** para actuar sobre una operación viva, no para mostrar datos. Existe con un solo fin: **permitir que un humano valide la hipótesis** (Protocolo, Gate 1 — instrumento Wizard-of-Oz). Toda la estación habla el vocabulario de `ONTOLOGY.md` (compromiso · ventana · punto de no retorno · acción reversible · valor expuesto · resultado). Fecha: 2026-06-30.
>
> **Filtro único de existencia (por componente):** *¿cómo ayuda esto a preservar valor antes del punto de no retorno?* Sin respuesta → se elimina.

## Antes de diseñar — el trabajo real

**¿Qué decisiones toma el supervisor en un día normal?** Una sola, repetida todo el día: **¿dónde gasto mi próxima intervención (atención / mejor recurso / una llamada) para preservar más valor antes de que se cierre una ventana?** Se descompone en: (1) *¿qué hago AHORA?* (triage continuo); (2) *¿qué acción?* (reasignar/expeditar/renegociar/escalar); (3) *¿este flag es real o ruido?* (validar antes de actuar); (4) *¿ya es tarde?* (no malgastar en lo que cruzó el punto de no retorno); (5) *¿funcionó?* (cerrar el lazo); (6) *¿qué puedo ignorar tranquilo?* (la decisión de silencio).

**¿Qué información necesita?** Para cada decisión, lo mínimo: el conjunto de compromisos **en ventana abierta**, rankeados por **valor expuesto × cierre de ventana**, con —por ítem— valor en riesgo, **tiempo al punto de no retorno** (no el plazo), el porqué (la restricción que ata) y la acción reversible. Para validar: la cadena de evidencia + la incertidumbre declarada. Para actuar: las acciones factibles + si hay **slack** para ejecutarlas. Para confirmar: si el resultado cambió.

**¿Qué información sobra?** Datos de CRM (contactos, etapa, historia), KPIs financieros (MRR, pipeline), gráficos/tendencias que no disparan una acción, todo lo **sano** (no en ventana), todo lo **ya perdido** (cruzó el punto de no retorno), feeds cronológicos, reportería histórica.

**¿Qué acciones ejecuta realmente?** Pocas, y cada una **cambia la operación**: reasignar recurso · expeditar · renegociar plazo · escalar · descartar/aceptar-pérdida (con razón). Nada más.

**¿Qué nunca debería buscar?** Qué es lo más urgente ahora (está en el Hero) · la evidencia de un flag (un clic, jamás una cacería) · las acciones de un compromiso (presentes en el momento de decidir) · si algo ya pasó el punto de no retorno (jamás actuar sobre eso por error) · el estado de una acción que tomó (el lazo se cierra solo). **Si tiene que buscar, el ranking falló.**

---

## Arquitectura de la estación (6 capas, jerarquía exacta)

### 1 · LA DECISIÓN DE AHORA (Hero)
**Una sola** —la intervención protectora de mayor valor en este instante—, legible en <10s, y que es una **decisión ejecutable**, no una notificación. Muestra: **qué ocurre** (la deriva) · **por qué importa** (valor expuesto, en $) · **cuánto tiempo queda** (tiempo al *punto de no retorno*, no al plazo) · **qué acción recomienda** (reversible, factible) · **una línea de evidencia**. Tres respuestas posibles: *actuar* (un clic), *descartar con razón*, o *abrir la evidencia*.
*Justificación:* toda la propuesta de valor es actuar antes del punto de no retorno; el Hero **es** esa propuesta hecha puesto de trabajo. Si el supervisor hace una sola cosa por sesión, es esta. Mostrar el *punto de no retorno* y no el *plazo* es lo que lo separa de cualquier alerta.

### 2 · SALUD OPERACIONAL (un vistazo, cero CRM)
Cuatro magnitudes que responden *"¿debo preocuparme / voy al día?"*, todas en valor o capacidad: **Valor protegido hoy** (lo que mis acciones salvaron — mi marcador) · **Valor expuesto en ventana** (lo que aún se puede proteger — lo que está en juego) · **Valor perdido hoy** (lo que cruzó el punto de no retorno — lo que se escapó) · **Capacidad de intervención disponible** (slack: ¿puedo siquiera actuar?). Más **una** tendencia: ¿el valor expuesto en ventana crece o baja? (¿la operación se enferma o sana ahora?).
*Justificación:* cada número dispara una decisión — ¿hay trabajo? ¿cuánto está en juego? ¿estoy perdiendo? ¿puedo actuar? `Valor protegido hoy vs Valor perdido hoy` es **el veredicto vivo de la hipótesis**. Sin la capacidad/slack, la detección es inútil (por eso está aquí, no en un reporte).

### 3 · COLA DE SUPERVISIÓN (priorizada por impacto, nunca cronológica)
Lo que sigue después del Hero: la lista de compromisos en ventana, ordenada por **impacto esperado** (valor expuesto × urgencia de ventana × accionabilidad). Cada ítem muestra **solo** lo necesario para decidir actuar-o-no: compromiso, valor expuesto, tiempo al punto de no retorno, el porqué en una palabra, la acción recomendada. Bajo un umbral de valor/urgencia, los ítems se **colapsan** (no se persigue lo trivial — disciplina de falsos positivos). Se re-ordena viva a medida que el mundo cambia.
*Justificación:* es la decisión núcleo (triage continuo). Ordenar por **impacto y no por tiempo** es el diferenciador frente a un dispatch board o una bandeja de alertas.

### 4 · EVIDENCIA (por qué creerle — razonamiento auditable, no IA mágica)
Al seleccionar un compromiso, el supervisor entiende en segundos —para **validar antes de actuar**—: **Observado** (los hechos presentes: el compromiso, su estado, el recurso que ata — solo observables, sin leakage) · **Concluido** (trayectoria → punto de no retorno → incumple) · **Incertidumbre** (lo que NEXUS *no* sabe; confianza declarada) · **Acción propuesta + factibilidad** (¿hay slack?) · **Si no se hace nada** (resultado proyectado + valor perdido).
*Justificación:* la confianza es la compuerta de adopción (métrica del Protocolo). La incertidumbre **mostrada** es lo que deja al humano aplicar su conocimiento tácito ("NEXUS no sabe que Carlos siempre termina rápido" → descartar). Aquí el humano + NEXUS se combinan: NEXUS aporta la observación completa; el humano, el override tácito. Sin esto, el supervisor sobre-confía (actúa sobre ruido) o sub-confía (ignora todo).

### 5 · ACCIÓN (pocas, cada una cambia la operación)
Cinco, presentes **en el momento de decidir** (en el Hero/evidencia), no en un menú: **Reasignar recurso** · **Expeditar** · **Renegociar plazo** · **Escalar** (cuando la acción excede la esfera del supervisor) · **Descartar / Aceptar pérdida** (con razón obligatoria). Cada una —incluido descartar— se registra (capa 6).
*Justificación:* cada acción es una *acción reversible* del canon que cambia el resultado del compromiso. Descartar-con-razón **es** una acción: es el dato de precisión/falsos positivos. Ningún botón que no cambie la operación ni capture una decisión (sin exportar, compartir, "marcar leído").

### 6 · APRENDIZAJE (construir evidencia, no entrenar IA)
Tras cada acción, captura con fricción casi nula (un tap, no un formulario): **qué hizo** el supervisor · **por qué** · y luego, al resolverse el compromiso, **qué ocurrió después**. Y —clave para el Protocolo— **antes de revelar la recomendación**, elicita *"¿qué ibas a hacer?"* (para medir el **cambio de decisión**, Gate 1).
*Justificación:* la estación existe para que un humano valide la hipótesis; esta capa **es** la recolección de datos. Debe ser invisible o el supervisor no la hará en 8 horas — y sin ella, trabaja pero no aprendemos. Es el puente de "el supervisor hace su trabajo" a "tenemos evidencia".

---

## Flujo del supervisor durante un día
1. **Inicio de turno:** abre → mira la **Salud** (capa 2: ¿voy al día? ¿tengo slack?) → la **Decisión de Ahora** (capa 1). Actúa sobre el Hero.
2. **Bucle continuo:** baja por la **Cola** (capa 3); por cada uno: abre **Evidencia** (4) → valida → **Actúa/Descarta** (5) → **Captura** (6). La cola se re-ordena viva.
3. **Cuando no hay nada accionable:** la estación muestra *"todo lo material está protegido"* + el vistazo de salud — **silencio legible**: el supervisor respira y atiende otra cosa, confiando en que nada material está sin vigilar. Crítico para 8 horas: debe permitirle **dejar de escanear** cuando de verdad no hay nada.
4. **Cierre del lazo:** al resolverse los compromisos accionados, la capa 6 pide confirmar el resultado.
5. **Fin de turno:** el marcador de salud — `Valor protegido hoy vs Valor perdido hoy` — es el veredicto del día y el incremento de evidencia.

## Componentes ELIMINADOS (y por qué)
- **Dashboard, gráficos y tendencias por sí mismos** → no disparan la próxima acción protectora.
- **Datos de CRM (contactos, etapa, historia)** → irrelevantes a una ventana.
- **KPIs financieros (MRR, pipeline, ingresos)** → no son salud operacional ni accionables en ventana.
- **Feeds cronológicos / logs de actividad** → tiempo ≠ impacto; entierran lo importante.
- **Compromisos sanos o ya completados** → fondo, no trabajo.
- **Lo que ya cruzó el punto de no retorno** → fuera de la cola de trabajo (va a un *registro de perdidos hoy*, solo para aprendizaje); nunca como algo accionable.
- **Búsqueda** → si hay que buscar, el ranking falló.
- **Centro de notificaciones como destino** → el Hero lo reemplaza; una alerta que hay que ir a revisar es un fracaso: la decisión viene a ti.
- **"% de confianza de IA" sin cadena** → magia, no auditable; sustituido por la capa de Evidencia.
- **Navegación multi-módulo / pestañas** → el supervisor vive en UNA superficie; navegar lejos de la operación viva es, en sí, un modo de falla.
- **Botones decorativos (exportar, compartir, configurar en el flujo)** → no cambian la operación.

## Principios de la experiencia (todos derivan de "preservar valor antes del punto de no retorno")
La estación **abre con una decisión**, no con una pantalla que interpretar · todo se ordena por **impacto en valor**, jamás por tiempo · lo que cruzó el **punto de no retorno** nunca aparece como trabajo · el **silencio es legible** (se confía en lo que no se ve) · **evidencia + incertidumbre** a un clic de cada flag · cada acción —incluido no hacer nada— se **captura como evidencia** sin fricción · el recurso más escaso es **la atención del supervisor**, y el único trabajo de la estación es gastarla en la ventana abierta de mayor valor, continuamente.
