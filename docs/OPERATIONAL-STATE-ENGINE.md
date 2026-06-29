# Operational State Engine — Especificación del Primer Componente del Motor Cognitivo

> **Naturaleza de este documento.** No es una arquitectura nueva. Es la **especificación del primer componente implementable** del Motor Cognitivo ya cerrado: el Operational State Engine (OSE). El OSE es la **implementación del Ritmo de Comprensión** (PERCIBIR + COMPRENDER) más el **barrido de Vencimiento**. Toda interfaz, contrato y paso aquí se rastrea a un **acto** de la Arquitectura, a un **tipo del MOV**, o a un **invariante** ya enunciado en los cuatro documentos gobernantes. **No se introduce ni un concepto, acto, tipo ni invariante nuevo.** Donde una afirmación no pueda anclarse a un nombre literal del canon, no aparece.
>
> **Independencia.** Esta especificación es independiente de tecnología (sin base de datos, sin framework, sin transporte, sin modelo de IA, sin multi-tenant) y de dominio (sin sector concreto). Los puertos son contratos puros, no implementación. Toda propiedad cuya verdad dependa de elegir una tecnología de persistencia, un mecanismo de transporte o un calendario de dominio ha sido reformulada a su concepto canónico (abstención, dos relojes, Ley del Eslabón Débil, relatividad de rol, orden temporal sellado) o eliminada.

---

## 1. Situación, responsabilidad y frontera dura del OSE

### 1.1 Qué ES el OSE

El OSE ejerce, de forma constante y silenciosa, el **Ritmo de Comprensión**: la cadena `cada cambio → PERCIBIR → COMPRENDER` que mantiene actualizado el **Modelo Operacional Vivo (MOV)**, produzca o no una decisión más tarde. A esa marcha continua suma el **barrido de Vencimiento**: el registro del hecho negativo cuando una `expectativa` cruza su borde de vencimiento sin cumplirse (el vencimiento es un disparo legítimo del gate **G0**, equivalente a una observación nueva).

El OSE es exactamente **PERCIBIR + COMPRENDER (+ Vencimiento)** y nada más. Operacionalmente es la sede de los **cuatro gates canónicos** del Motor —y solo esos cuatro:

- **G0 — Disparo.** El motor sale de su sueño cuando, y solo cuando, entra una `observacion` nueva **o** vence una `expectativa` (ausencia observada al pasar el horizonte sellado). Sin combustible externo, el OSE **duerme**.
- **G1 — ¿Real y vigente?** La entrada se ancla a su referente de sustancia (`entidad_objeto` / `compromiso` / `flujo_recurso` / `vinculo`) y se le fijan ambos sellos antes de creerla.
- **G2 — Sorpresa.** Se mide la sorpresa de la observación contra el **modelo vigente** (la `expectativa` que la cubra y el estado vigente de la entidad), heredando la confianza por la Ley del Eslabón Débil.
- **G3 — Integrar.** Se integra el hecho al MOV propagando por dependencias y reaplicando el Eslabón Débil; el MOV vuelve a ser internamente coherente. Si la sorpresa cruza el umbral, se emite una `perturbacion`.

### 1.2 La ÚNICA responsabilidad

El OSE tiene una sola responsabilidad, indivisible: **mantener vivo y verdadero el MOV** —estado de las entidades de sustancia (familia A), creencias (familia B: `observacion`, `inferencia`, `expectativa`), el **lado observado** de las `brecha` (D, como distancia estado-vs-referente ya existente)— **y emitir una `perturbacion` (E) cuando la sorpresa cruza el umbral de relevancia.**

La salida máxima del OSE es una `perturbacion`: *"esto cambió y sorprende"*. El OSE **nunca** escribe juicio, diagnóstico, recomendación, opción ni acción. Su producto es un MOV más actualizado y, cuando hay sorpresa supra-umbral, una `perturbacion` sellada que el resto del motor consumirá.

### 1.3 La FRONTERA DURA — qué el OSE NO hace y a quién pertenece

El OSE produce un MOV vivo y `perturbacion`es; **se detiene ahí**. Todo lo siguiente queda explícitamente fuera de su superficie:

| Excluido del OSE | Acto dueño | Por qué no es del OSE |
|---|---|---|
| Rankear qué brecha merece pensamiento ahora; asignar foco y presupuesto cognitivo (salience) | **ATENDER** | El OSE deja la `perturbacion` visible para ATENDER; la asignación real de foco la hace ATENDER. El OSE no rankea. |
| Determinar el **porqué**; clasificar síntoma/causa/restricción; recorrer el grafo causal hacia atrás | **DIAGNOSTICAR** | El OSE actualiza estado y mide sorpresa; no atribuye causa. La causalidad se consulta, no es su salida. |
| Generar y proyectar `intervencion`es; elegir, abstenerse o escalar | **JUZGAR** | El OSE nunca propone acción ni se compromete. Su salida tope es la `perturbacion`, no un `compromiso`. |
| Proyectar la decisión al rol que puede actuar, en su lenguaje y horizonte | **ARTICULAR** | El OSE no tiene destinatario-rol; mantiene el MOV, que es relativo a rol solo al ser consultado por los actos aguas abajo. |
| Comparar predicho-vs-real de una **decisión** y **calibrar** la confianza causal (`relacion_causal`, `trayectoria` esperadas, priores de atención) a partir de `episodio`s decisión↔resultado | **RECONCILIAR** (post-outcome) | Ver §1.4: límite preciso con RECONCILIAR. |

**Negación estructural.** El OSE **no se enciende a sí mismo**. No introspecciona, no repasa temas cerrados sin un hecho nuevo, no abre presupuesto. Un tema cerrado solo se reabre porque entra una `observacion` que lo contradice (sorpresa medida) o vence una `expectativa`. No hay impulsor interno perpetuo.

### 1.4 El límite preciso con RECONCILIAR

Este es el corte más fino, porque ambos actos "comparan lo esperado con lo real". La distinción canónica es **qué se corrige y con qué insumo**:

> **El OSE corrige el modelo del MUNDO por percepción** (estado de sustancia A, creencias B, lado observado de `brecha` D, `expectativa` B). **RECONCILIAR corrige el modelo CAUSAL por outcome** (`relacion_causal`, `trayectoria` esperadas, priores de ATENDER, `episodio`s).
>
> El OSE **detecta y registra el VENCIMIENTO** de cualquier `expectativa` —incluida una sembrada por una decisión— y emite su `perturbacion`. Pero **leer ese vencimiento como veredicto sobre una decisión**, escribir el `episodio`, y recalibrar confianzas causales y priores es trabajo de **RECONCILIAR**. El OSE provee el *disparo* (la ausencia o la discrepancia es el dato); RECONCILIAR provee el *aprendizaje*.

En consecuencia, el OSE **nunca escribe `episodio`** ni modifica la confianza de una `relacion_causal` o una `trayectoria` como producto de un resultado de decisión. El OSE solo mueve el Sello Epistémico de creencias del estado presente al absorber observaciones, con la prohibición de promoción silenciosa siempre activa.

### 1.5 Por qué el OSE es el PRIMER componente implementable

1. **Todo acto aguas abajo lee de un MOV mantenido.** La decisión es una **consulta a un MOV vivo, no su origen**. Sin la sustancia mantenida, los demás actos no tienen sobre qué operar. El OSE es lo que produce esa sustancia.
2. **Corre constante y en silencio; es el ritmo base.** El Ritmo de Juicio es intermitente y solo despierta ante una brecha supra-umbral. El Ritmo de Comprensión es continuo. Implementar primero el ritmo continuo garantiza que, cuando llegue el primer juicio, exista comprensión que lo preceda: *la comprensión precede al juicio.*
3. **Es lo mínimo que hace VIVO al MOV.** Sin reconciliación-por-percepción ni barrido de Vencimiento, el MOV envejece hacia la fantasía. El OSE es el conjunto mínimo de actos que convierte un esquema estático en un modelo vivo.

---

## 2. Los puertos del OSE (interfaces como contratos)

El OSE expone **exactamente tres puertos**. No tiene ningún otro punto de contacto con el mundo. **No** existe un "puerto de lectura" ni un "puerto de escritura" como interfaces del OSE: la **escritura es el efecto interno de COMPRENDER** (no un puerto), y la **lectura del MOV pertenece a los actos aguas abajo** (no se modela una superficie read/write tipo motor de consultas).

| Puerto | Dirección | Qué cruza la frontera | Acto / tipo canónico |
|---|---|---|---|
| **P-IN — Señal cruda** | entrada | Un evento crudo sin tipar: contenido + procedencia declarada + instante de mundo declarado. | Frontera de entrada de **PERCIBIR** (G0 por señal, G1). |
| **P-CLK — Avance del instante de mundo** | entrada | Notificación de que el instante de mundo avanzó. Único combustible del barrido de Vencimiento. | Reloj de mundo del Motor (dos relojes); G0 por Vencimiento. |
| **P-OUT — Perturbación** | salida | Una `perturbacion` sellada `{ clase, afectadas, magnitud, propagacion }`. Es lo máximo que el OSE produce. | G3; tipo `perturbacion` (familia E). |

**Invariante de frontera (I-0).** Toda escritura del OSE recae sobre el MOV (la única sustancia) o sobre P-OUT. El OSE no escribe `relacion_causal` ni `trayectoria` (familia C) ni `objetivo`/`restriccion`/`norma_conducta` (familia D) como producto de razonamiento; no escribe `intervencion`, proyección de rol, ni `episodio`.

---

### Puerto P-IN — Ingesta de señal de cambio de realidad (entrada)

*Materializa el acto PERCIBIR (frontera de entrada) y los gates G0 (disparo por señal) y G1 (anclaje).*

- **Dirección:** entrada. El mundo entrega un evento crudo. El OSE no conoce ni nombra al emisor como componente; solo recibe el evento con su procedencia. El OSE no devuelve juicio.
- **Qué entra:** un **evento crudo candidato a observación** con: contenido; sujeto declarado (referencia a una `entidad_objeto`/`compromiso`/`flujo_recurso`/`vinculo` cuando el emisor la conoce); **procedencia** (origen y fiabilidad de la fuente); **instante de mundo** declarado; **granularidad y certeza temporal** declaradas. Si falta el instante de conocimiento, se toma el instante de admisión.
- **Qué sale:** un **acuse de admisión** con uno de tres veredictos —`ADMITIDA` / `INADMISIBLE` / `INCLASIFICABLE`— y la identidad de la `observacion` sellada si se admitió. **No** devuelve interpretación, sorpresa ni recomendación.
- **Precondiciones (garantiza el llamante):**
  - El evento porta procedencia trazable. Cruzar la frontera no concede estatus: es candidata, no verdad.
- **Postcondiciones (garantiza el OSE):**
  - Si `ADMITIDA`: se crea una `observacion` inmutable, con Sello Epistémico (estatus = HECHO) y Sello Temporal completos. La frescura nace de la distancia entre instante de mundo e instante de conocimiento.
  - La `observacion` queda **anclada a su referente del MOV** (a qué `entidad_objeto`/`compromiso`/`flujo_recurso`/`vinculo` se refiere). El anclaje no recorre causalidad.
  - Toda `observacion` admitida queda disponible como combustible para COMPRENDER.
- **Ramas (mutuamente excluyentes):**
  - **ADMITIDA.** Procedencia trazable + anclable a un referente. Continúa a G2.
  - **INADMISIBLE.** Procedencia desconocida → no admisible como `observacion`. Se descarta **con su incertidumbre registrada**; **no contamina el MOV como HECHO**.
  - **INCLASIFICABLE.** Anclable nominalmente pero el sujeto no corresponde a ningún tipo del catálogo (posible novedad de tipo). Se trata como **`observacion inclasificable`** por el gancho de **apertura ontológica**. Se sella igualmente (porta ambos sellos, estatus = HECHO como observación) con su confianza poblada según su procedencia, **sin** forzarla a un tipo existente ni inventar un tipo nuevo. Es gancho, no capacidad: la observación inclasificable sigue el resto del flujo (puede sorprender por sí misma).
- **Tipos del MOV que toca:** crea **`observacion` (B)**; referencia **`entidad_objeto`/`compromiso`/`flujo_recurso`/`vinculo` (A)** solo para anclar; usa Sello Epistémico y Sello Temporal.

---

### Puerto P-OUT — Emisión de perturbación (salida)

*Materializa el producto máximo del OSE: la `perturbacion` que COMPRENDER emite en G3 cuando la sorpresa supera el umbral. Es el límite duro de competencia.*

- **Dirección:** salida. El OSE deja la `perturbacion` en su puerto de salida; **no conoce a sus consumidores ni depende de su respuesta** (relatividad de rol). La emisión no es un `compromiso` ni espera reciprocidad. El cómo se transporta la perturbación es decisión de implementación, ajena a este contrato.
- **Qué entra al puerto (desde el interior del OSE):** el resultado de G2/G3: la observación (o el vencimiento) que originó el despertar, la `expectativa` contra la que se midió cuando la había, y la magnitud de sorpresa como **relación de orden**.
- **Qué sale:** una **`perturbacion` (E) sellada** con sus cuatro campos canónicos:
  - **clase** — qué tipo de cambio (campo del tipo `perturbacion`, **sin dominio de valores prefijado** por esta especificación; cualquier ejemplo de clase es ilustrativo, no normativo).
  - **afectadas** — referencias a las entidades A tocadas.
  - **magnitud** — la sorpresa medida como relación de orden, con confianza heredada por el Eslabón Débil.
  - **propagacion** — el **conjunto de entidades alcanzadas por propagación de coherencia**: aquellas a las que el Eslabón Débil llegó al reaplicarse por las **dependencias ya existentes en el MOV** (`vinculo` de dependencia/contención). **Nunca** es estimación de impacto, urgencia o tratabilidad, ni recorrido del grafo causal hacia atrás (eso es ATENDER / DIAGNOSTICAR).
- **Precondiciones (garantiza el OSE antes de emitir):**
  - La sorpresa medida en G2 **superó el umbral de relevancia**.
  - La sorpresa hereda la Ley del Eslabón Débil: nunca declara más certeza que la más débil de las creencias comparadas.
- **Postcondiciones (garantiza el OSE):**
  - La `perturbacion` porta Sello Epistémico y Temporal completos.
  - La `observacion` que la fundó es su **procedencia**, no la misma entidad: la observación es el anclaje, la perturbación es el disparador. (Esto se sigue de "observación = única fuente de anclaje" y "perturbación = disparador"; no requiere ley adicional.)
  - **Invariante de no-juicio (verificable):** la `perturbacion` **NO porta** causa, opción, prioridad, score, urgencia, ranking ni recomendación de foco. Hacer visible la perturbación a ATENDER significa únicamente *existir y ser visible*; la asignación de salience la hace ATENDER. **Cualquier campo de prioridad en la `perturbacion` es un estado inalcanzable.**
  - Si la sorpresa nació de territorio no modelado o de un tipo no catalogado, la perturbación se marca con el gancho de **apertura ontológica** reusando `observacion inclasificable`; el OSE **detecta y señala que algo no catalogado apareció, sin afirmar qué es**.
- **Ramas (mutuamente excluyentes):**
  - **EMITE.** Sorpresa > umbral → se produce la `perturbacion` y se deja en P-OUT.
  - **NO EMITE (absorción).** Sorpresa ≤ umbral → el OSE **confirma la expectativa, refresca su Sello Temporal y vuelve al reposo sin emitir**. La confirmación por una observación de baja confianza **no eleva** la confianza ni la frescura de la `expectativa` por encima de la del observable que la confirmó. La re-confirmación por una entrada que comparte procedencia, instante de mundo y contenido con una ya absorbida **no vuelve a mover la frescura**: re-anclar la misma realidad no es evidencia nueva (Eslabón Débil). El silencio está ganado.
- **Tipos del MOV que toca:** crea **`perturbacion` (E)**; lee **`observacion`** y **`expectativa`** (B), y **`trayectoria`** (C) **solo como lectura** si existía proyección contra la cual medir. Referencia entidades A como afectadas.

---

### Puerto P-CLK — Disparador temporal / barrido de Vencimiento (entrada por avance del instante de mundo)

*Materializa el segundo origen legítimo de disparo (G0): el VENCIMIENTO de una `expectativa` (ausencia observada cuando el horizonte sellado pasa sin cumplirse). Detectar lo que NO ocurrió dentro de su horizonte es PERCIBIR registrando una ausencia comprometida, no un reloj que reabre temas por capricho.*

- **Dirección:** entrada disparada por el **avance del instante de mundo** (combustible externo, no temporizador interno). Cumple "sin impulsor interno" porque el combustible es el cambio del reloj de mundo, externo al OSE.
- **Qué entra:** la notificación de que el **instante de mundo** avanzó. El OSE barre las `expectativa` cuyo **borde de vencimiento** quedó cruzado por ese avance.
- **Qué sale:** por cada `expectativa` vencida-sin-cumplir, un **hecho negativo** que se procesa exactamente como una observación nueva (entra por la lógica G2→G3 y puede producir una `perturbacion` por P-OUT). La ausencia es el dato.
- **Precondiciones (garantiza el OSE):**
  - Solo se evalúan `expectativa` con **ventana de cumplimiento finita** y horizonte sellado. El no-cumplimiento *dentro* de ventana no genera señal.
  - El vencimiento se evalúa contra el **eje temporal sellado en la propia `expectativa`** (su horizonte y su granularidad declarada). El OSE **no presupone la naturaleza de ese eje** (uniforme, calendárico, pausable): solo verifica, por la **relación de orden** del eje sellado, si el avance del instante de mundo **cruzó el borde de vencimiento**. La política del eje es insumo sellado en la expectativa, no conocimiento del OSE.
- **Postcondiciones (garantiza el OSE):**
  - Al cruzarse el borde sin cumplimiento, la `expectativa` transita a *vencida-sin-cumplir* mediante un **evento explícito y trazable**, generado por el propio OSE sin observación externa nueva.
  - El **reloj que decide el vencimiento es el instante de mundo** (el horizonte es un borde de mundo; la ausencia ocurre en el mundo). El **instante de conocimiento** del barrido es "ahora" **solo para sellar** el hecho negativo, **nunca** para decidir si venció. (Esto preserva los dos relojes y no los colapsa.)
  - El hecho negativo se mide como sorpresa contra **esa misma expectativa**, igual que cualquier observación, **sin fórmula de composición**: la ausencia, comparada con la predicción y la tolerancia de la expectativa, produce la magnitud de sorpresa.
  - Una `expectativa` vencida-sin-cumplir **se transita una sola vez** por su cruce de borde: el barrido no genera disparos repetidos sobre el mismo vencimiento. Un horizonte cuyo borde no ha sido cruzado **no se reevalúa**.
  - El OSE **no diagnostica** por qué no ocurrió (eso es DIAGNOSTICAR).
- **Ramas (mutuamente excluyentes):**
  - **VENCIMIENTO DETECTADO.** Borde cruzado sin la observación esperada → hecho negativo hacia G2/G3.
  - **DENTRO DE VENTANA.** El borde no se ha cruzado → **sin señal**. El OSE permanece en vigilancia con la expectativa armada, sin gastar juicio.
  - **CUMPLIDA ANTES DEL BORDE.** Llegó la observación esperada dentro de ventana → la expectativa se resolvió por P-IN (absorción o sorpresa); el barrido no la considera vencida.
- **Tipos del MOV que toca:** lee y transita el estado de **`expectativa` (B)** (su `resultado`: a *vencida-sin-cumplir*); usa el horizonte y su borde de vencimiento; el hecho negativo puede engendrar **`perturbacion` (E)**. No crea `observacion` del mundo: la ausencia no es una observación del mundo, es un hecho generado por el avance del tiempo.

---

### Composición de los tres puertos

```
        MUNDO (evento crudo)                AVANCE DEL INSTANTE DE MUNDO
                 │                                      │
        ┌────────▼─────────┐                  ┌─────────▼──────────┐
        │ P-IN  INGESTA    │                  │ P-CLK  BARRIDO     │
        │ PERCIBIR · G0/G1 │                  │ DE VENCIMIENTO     │
        │ → observacion (B)│                  │ → hecho negativo   │
        └────────┬─────────┘                  └─────────┬──────────┘
                 │ (admitida)                           │ (vencida-sin-cumplir)
                 └──────────────┬───────────────────────┘
                                ▼
                   ┌────────────────────────────────────┐
                   │ COMPRENDER (efecto interno)         │
                   │ G2 sorpresa vs modelo vigente       │
                   │ G3 integrar al MOV (coherente)      │
                   └────────────┬───────────────────────┘
                                │ sorpresa > umbral
                                ▼
                   ┌────────────────────────────┐
                   │ P-OUT  EMISIÓN perturbacion │  el OSE no espera respuesta
                   │ E = {clase, afectadas,      │ ───────────────► ATENDER (FUERA del OSE)
                   │      magnitud, propagacion} │
                   └────────────────────────────┘
```

La escritura del MOV y la lectura del MOV **no son puertos**: la escritura es el efecto interno de G3; la lectura del estado vigente la realizan los actos aguas abajo cuando consultan el MOV, cada elemento devuelto con su sello (un peldaño nunca lee un valor desnudo). El OSE **duerme por defecto** y solo se mueve por P-IN o P-CLK.

---

## 3. Contratos e invariantes que toda operación respeta

> Estas son las **leyes que ninguna operación del OSE puede violar**. Toda escritura al MOV y toda emisión está sujeta a ellas. Una operación que no pueda satisfacerlas **se abstiene** (derecho a abstenerse), en lugar de degradar una ley.

**Sujeto.** El OSE solo escribe tipos de las familias **A (sustancia)**, **B (creencia)** y **E (perturbación)**. **PROHIBIDO** que el OSE escriba tipos de **C (explicación)** o **D (normativa)** como decisión propia. Lee `brecha` (D) y `expectativa` (B) para **medir**; su única emisión hacia el ritmo de juicio es `perturbacion`.

**Regla de cierre (abstención, no atomicidad).** Si una mutación no puede satisfacer simultáneamente todos los invariantes que le aplican, el OSE **se abstiene de mutar el MOV**; el MOV **nunca es observable en estado incoherente**. (Esto se exige como propiedad de estado, no como transacción de un store: no se invoca "confirmar", "commit" ni "atomicidad".)

---

### INV-1 — Sellado completo obligatorio

Ninguna entidad del MOV existe sin **ambos** sellos completos.
**Sello Epistémico** = `{ estatus, confianza, procedencia }`. **Sello Temporal** = `{ instante_de_mundo, instante_de_conocimiento, validez, frescura }`.
- Precondición: la entidad candidata porta los dos sellos con todos sus campos poblados. Ningún campo de sello queda vacío ni "se completa después".
- **Rama (no se puede sellar):** si no puede determinarse la procedencia o el instante de conocimiento, el OSE **se abstiene de escribir** esa entidad. No inventa procedencia ni reloj.
- La **procedencia es un campo del Sello Epistémico**, no una entidad ni un componente de almacenamiento.

*Fuente:* MOV — "Todo porta SELLO EPISTÉMICO y SELLO TEMPORAL".

---

### INV-2 — Etiqueta epistémica correcta y no promoción a HECHO

El `estatus` debe corresponder al **origen real**, y **solo una observación** puede portar HECHO.
- Observación: `estatus = HECHO` (única fuente de anclaje del MOV). La ausencia observada por vencimiento es también una observación de hecho negativo: HECHO, con procedencia = el barrido de Vencimiento del propio OSE.
- Inferencia / estado derivado / expectativa: `estatus ∈ {INFERENCIA, HIPOTESIS}`; **nunca** HECHO. Un `entidad_objeto.estado` derivado en COMPRENDER es INFERENCIA, no HECHO.
- **PROHIBIDO:** que una integración cambie el estatus de INFERENCIA/HIPOTESIS a HECHO. El único modo de que el MOV contenga un HECHO es que **entre** una observación con ese estatus.

*Fuente:* Constitución — etiqueta epistémica HECHO/INFERENCIA/HIPOTESIS; MOV — observación como única fuente de anclaje.

---

### INV-3 — Ley del Eslabón Débil y no promoción silenciosa

Nada derivado o actualizado declara **más confianza** ni **más frescura** que su premisa más débil.
- `confianza_resultante ≤ min(confianza_premisas)`; una confirmación por un confirmador de baja confianza **no eleva** la confianza por encima de la de ese confirmador.
- La frescura resultante no supera la del confirmador; una confirmación vieja no rejuvenece la creencia.
- **PROHIBIDO — promoción silenciosa:** subir confianza o frescura sin premisa entrante que lo justifique. No hay subida por acumulación ni por repetición de la misma fuente.

*Fuente:* MOV — "Ley del Eslabón Débil"; Motor — "Prohibida la promoción silenciosa de confianza".

---

### INV-4 — Dos relojes y re-anclaje de la misma realidad

El OSE distingue **instante_de_mundo** (cuándo ocurrió) de **instante_de_conocimiento** (cuándo lo supo) y **nunca los colapsa**.
- Toda observación e integración registra ambos por separado. El instante de mundo puede llegar fuera de orden: una observación tardía de un hecho antiguo es legítima y se sella con su instante de mundo real y el instante de conocimiento actual.
- **Re-anclaje (no acumulación de evidencia):** dos entradas que comparten **instante de mundo y procedencia** pero difieren en instante de conocimiento son **re-anclajes del mismo hecho de mundo**, no dos hechos. El OSE no las suma como evidencia nueva (Eslabón Débil: no hay subida por repetición de la misma fuente). La **identidad de un hecho de mundo se establece por su sello**, no por un mecanismo de transporte ni de deduplicación de mensajes.
- **Reordenamiento:** una observación con instante de mundo anterior a uno ya conocido **no** sobrescribe ciegamente el estado más reciente; se integra como creencia sellada con su instante de mundo, y si entra en conflicto con lo vigente se aplica INV-7, no un "último que escribe gana".

*Fuente:* Motor — "Dos relojes: instante de mundo vs de conocimiento"; MOV — Sello Temporal. (No se introduce "idempotencia" ni "monotonía del reloj de conocimiento" como leyes: son propiedades de transporte, ajenas al canon. La propiedad deseada —no inflar confianza por reenvío— queda atada al Eslabón Débil más los dos relojes.)

---

### INV-5 — Contrato de sorpresa: medición contra el modelo vigente

La **sorpresa** es **una sola cantidad** medida contra el **modelo vigente** (con umbral). No es una taxonomía de tipos.
- **Con `expectativa` vigente que aplica:** la sorpresa es la desviación entre la observación y la `{prediccion, tolerancia, horizonte}` de la expectativa, respetando el Eslabón Débil (la confianza de la sorpresa no excede la premisa más débil).
- **Sin `expectativa` vigente que aplique:** la sorpresa se mide contra el **estado vigente del MOV**: la aparición de algo no modelado, una entidad nueva o una llegada de demanda que **no estaba representada** es sorprendente respecto al modelo que no la contenía, y **puede emitir `perturbacion`**. (Lo que **no** sorprende es la **re-observación redundante de un estado ya creído**: ahí la sorpresa es nula y no hay perturbación.)
- **PROHIBIDO:** inventar una `expectativa` retroactiva para "poder" medir sorpresa; medir sorpresa contra una `expectativa` no vigente (horizonte pasado: su no-cumplimiento se trata por Vencimiento, INV-8b, no por G2).

*Fuente:* Arquitectura — COMPRENDER "mide SORPRESA contra expectativa" e integra contra el MOV vigente; Motor — gates G2/G3; MOV — tipo `expectativa`.

---

### INV-6 — Invariante de NO-JUICIO: la salida máxima es una perturbación

La salida máxima del OSE hacia el resto del motor es una `perturbacion` (familia E). El OSE **nunca** escribe juicio, diagnóstico, recomendación, opción ni acción.
- Una `perturbacion` solo afirma "esto cambió y sorprende" con `{ clase, afectadas, magnitud, propagacion }`. **PROHIBIDO** que embeba o implique un "esto significa X" (diagnóstico) o un "haz Y" (recomendación), ni prioridad/score/ranking (eso sería salience encubierta de ATENDER).
- **PROHIBIDO** que el OSE escriba `relacion_causal`/`trayectoria` (C), `objetivo`/`restriccion`/`brecha`/`norma_conducta` (D) como producto de razonamiento; lee `brecha` y `expectativa` para medir, pero no las genera ni las prioriza.
- **PROHIBIDO** que el OSE rankee salience, diagnostique causas, proyecte opciones, articule al rol o calibre el MOV post-decisión.

*Fuente:* Arquitectura — "la comprensión PRECEDE al juicio"; definición del componente — "su salida máxima es una perturbación".

---

### INV-7 — Conflicto de fuentes: representar, no resolver

Cuando observaciones vigentes de **procedencias distintas** afirman estados incompatibles sobre la misma referencia, el OSE **representa** el conflicto con los conceptos ya definidos del MOV; **no** lo resuelve ni lo silencia.
- → el MOV sostiene una **creencia disyuntiva**; ambas premisas quedan selladas con su procedencia; ninguna se descarta por ser "la otra".
- Si no se cierra a lo largo de su validez, se mantiene como **conflicto persistente**.
- **PROHIBIDO:** elegir un ganador por heurística propia; promediar valores incompatibles; sobrescribir silenciosamente la observación previa.
- La aparición de una creencia disyuntiva es sorprendente respecto al estado previo y por INV-5 puede emitir `perturbacion` (medida contra el modelo vigente, aunque no hubiera expectativa), **sin** sugerir cuál fuente creer.
- Ninguna rama de la disyunción hereda confianza/frescura superior a su propia premisa (INV-3).

*Fuente:* MOV — "conflicto de fuentes (creencia disyuntiva / conflicto persistente) ya definidos"; Constitución — derecho a abstenerse de resolver lo no resoluble por observación.

---

### INV-8 — Apertura ontológica y barrido de Vencimiento

**INV-8a — Apertura ontológica.** Una observación cuyo **tipo** no encaja en ninguno de los 17 tipos se marca **`observacion inclasificable`** y, por ser sorpresa de cobertura contra el modelo vigente (INV-5), puede emitir `perturbacion`. Se sella igual (porta ambos sellos, estatus = HECHO) con su confianza poblada según su procedencia. **PROHIBIDO** descartarla por no encajar, encajarla a la fuerza en el tipo "más parecido", o crear un tipo nº 18.

**INV-8b — Barrido de Vencimiento.** El disparo del motor incluye el **vencimiento de una `expectativa`**: la ausencia observada cuando el horizonte sellado pasa sin cumplirse.
- Para toda `expectativa` cuyo **borde de vencimiento (en el eje de mundo sellado)** fue cruzado por el avance del **instante de mundo** y cuyo `resultado` sigue sin cumplimiento → el vencimiento es un disparo G0 legítimo (combustible externo, no impulsor interno perpetuo). El OSE registra la ausencia como hecho negativo.
- **PROHIBIDO** un bucle que reevalúe expectativas cuyo borde no ha sido cruzado.
- La ausencia se mide como sorpresa contra esa misma expectativa (INV-5); si cruza umbral → `perturbacion`, nunca un juicio.
- El mismo vencimiento **no vuelve a transitarse** una vez procesado.

*Fuente:* Motor — gate G0 incluye el vencimiento; "el motor DUERME por defecto"; MOV — `expectativa` (horizonte, resultado); MOV — apertura ontológica.

---

### INV-9 — Corte con RECONCILIAR (consolidación del límite, sin concepto nuevo)

El OSE corrige el modelo del **MUNDO** por percepción (estado A, creencias B, lado observado de `brecha` D, `expectativa` B). **RECONCILIAR** corrige el modelo **CAUSAL** por outcome (`relacion_causal`, `trayectoria` esperadas, priores de ATENDER, `episodio`s). El OSE **detecta y registra el VENCIMIENTO** de cualquier `expectativa` —incluida la sembrada por una decisión— y emite su `perturbacion`, pero **NUNCA** lee ese vencimiento como veredicto de decisión, **NUNCA** escribe `episodio`, y **NUNCA** mueve la confianza de una `relacion_causal` ni ajusta una `trayectoria`.

*Fuente:* Arquitectura — acto RECONCILIAR ("tras el resultado real de una decisión: calibra el MOV"); definición del componente — el OSE no RECONCILIA-calibra.

---

## 4. El flujo mínimo (mapeado a G0–G3 + barrido de Vencimiento)

### 4.0 Disparo (G0) y condición común

El bucle se ejecuta cuando, y solo cuando, ocurre uno de dos eventos externos:
- **G0-a (señal):** llega un evento crudo por **P-IN** → **Flujo A**.
- **G0-b (vencimiento):** llega un avance de reloj por **P-CLK** → **Flujo B**.

**Precondición común:** el MOV está coherente (todo derivado satisface el Eslabón Débil; ningún sello incompleto).
**Postcondición común:** al terminar, el MOV queda coherente y, si aplica, hay una `perturbacion` en P-OUT. El motor vuelve a **DORMIR**. No existe otra vía de activación.

---

### 4.1 Flujo A — Percepción y Comprensión (G0-a → G1 → G2 → G3)

**Paso A1 — PERCIBIR / anclar (acto PERCIBIR).** Convierte el evento crudo en una `observacion` tipada y sellada (única fuente de anclaje).
- Validar procedencia → compone el Sello Epistémico.
- Sellar temporalmente: instante de mundo, instante de conocimiento (= ahora), validez, frescura. Los dos relojes se sellan por separado y nunca se confunden.
- Clasificar contra un tipo del MOV (familia A o B). **Rama "tipo no catalogado":** se ancla como `observacion inclasificable` con marca de **apertura ontológica**; no se inventa un tipo nuevo; sigue el resto del flujo con su sello.
- Materializar la `observacion` con sus dos sellos.

**Paso A2 — G1: ¿real y vigente?**
- ¿Real? ¿La procedencia sostiene la observación como anclaje? ¿Vigente? ¿El instante de conocimiento cae dentro de la ventana de validez sellada?
- **Suficiente y vigente** → admite con su confianza nominal. Continúa a A3.
- **Evidencia insuficiente (regla dura):** no se descarta; se **registra con baja confianza** (se rebaja el componente *confianza* del sello). La degradación nunca puede subir (no promoción silenciosa). Queda registro de procedencia (campo del Sello Epistémico).

**Paso A3 — G2: medir SORPRESA contra el modelo vigente.** (La comprensión precede a todo juicio: este paso ocurre siempre.)
- Buscar la `expectativa` vigente cuyo objeto y horizonte cubran esta observación.
- **Con expectativa:** comparar el resultado observado contra la predicción dentro de su tolerancia; la sorpresa es la desviación.
- **Sin expectativa aplicable:** la sorpresa se mide contra el **estado vigente del MOV** (INV-5): una aparición o llegada no modelada es sorpresa; una re-observación redundante de un estado ya creído es sorpresa nula.
- **Rama "fuente en conflicto":** si la observación contradice otra creencia vigente de **otra procedencia** y ambas son admisibles, no se elige arbitrariamente: se representa con **`creencia disyuntiva`** y, si persiste, **`conflicto persistente`**. La sorpresa se mide respecto al modelo vigente, no respecto a la fuente rival.

**Paso A4 — G3: integrar al MOV.** Único paso que muta el estado sustantivo. Orden interno fijo:
1. **Actualizar SUSTANCIA (familia A)** según el objeto de la observación, y solo ese: `entidad_objeto` (estado/capacidad/ubicación, sin cambiar naturaleza ni cardinalidad); `flujo_recurso` (nivel y tasa, recomputando la proyección de agotamiento); `vinculo` (existencia/forma); `compromiso` (cumplimiento/holgura).
2. **Recomputar el LADO OBSERVADO de la `brecha` (D) ya existente** = distancia estado-vs-referente. El OSE **NO crea, NO genera, NO prioriza ni explica brechas**; el referente normativo (`objetivo`/`restriccion`) es **insumo de LECTURA**, no se crea aquí. La brecha es síntoma: el OSE no la explica (DIAGNOSTICAR) ni decide sobre ella (JUZGAR).
3. **Reemitir/cerrar la `expectativa` (B) afectada** con su nuevo horizonte y tolerancia. **NO se ajusta `trayectoria` (C):** su recalibración es RECONCILIAR. El OSE **solo lee** `trayectoria` para medir sorpresa. *(Cuando la observación actualiza la proyección de agotamiento de un `flujo_recurso` y esa proyección anticipa el cruce de un referente, el OSE **reemite la `expectativa` correspondiente con horizonte = el instante de mundo proyectado del cruce**; así el cruce previsible queda armado como expectativa con borde y será barrido por P-CLK vía Vencimiento —combustible externo legítimo, sin impulsor interno.)*
4. **Sellos derivados + Eslabón Débil.** Todo dato derivado recibe sus dos sellos y su confianza ≤ la de su premisa más débil. Prohibida la promoción silenciosa.
5. **Decisión de perturbación:**
   - **Rama "confirma":** `sorpresa ≤ umbral` → integración cerrada **sin** perturbación; el MOV queda actualizado y coherente. La confirmación refresca el Sello Temporal de la expectativa, pero **una re-confirmación por la misma señal (misma procedencia, mismo instante de mundo, mismo contenido) no vuelve a mover la frescura** (re-anclaje, INV-4). **Fin.**
   - **Rama "sorprende":** `sorpresa > umbral` → emitir por **P-OUT** una `perturbacion` con `{clase, afectadas, magnitud, propagacion}` (propagación = conjunto de entidades alcanzadas por propagación de coherencia vía dependencias, no estimación de impacto). El OSE **no** razona sobre la perturbación. **Fin.**

---

### 4.2 Flujo B — Barrido de Vencimiento (G0-b → G2 → G3)

Disparado **solo** por avance del instante de mundo en **P-CLK**.

**B1 — Detectar expectativas vencidas.** Recorrer las `expectativa` vigentes cuyo **borde de vencimiento (eje de mundo sellado)** fue cruzado por el avance del **instante de mundo** y que no fueron satisfechas dentro de su ventana. El barrido opera sobre expectativas; nunca inventa observaciones positivas.

**B2 — Registrar la AUSENCIA OBSERVADA (hecho negativo).** Por cada expectativa vencida: registrar el hecho negativo "no ocurrió X dentro de su horizonte", sellado: instante de mundo = fin del horizonte vencido; instante de conocimiento = ahora (el momento del barrido); estatus = HECHO (ausencia observada por vencimiento); procedencia = el barrido del OSE. (No hay G1 separado: la ausencia es real por construcción —el borde de mundo pasó— y vigente al instante del barrido.)

**B3 — G2: medir sorpresa de la ausencia.** Desviación entre la `expectativa` (que predecía cumplimiento) y el hecho negativo, medida igual que cualquier observación, contra tolerancia y resultado esperado. **Sin fórmula de composición.**

**B4 — G3: integrar y, si aplica, emitir.** Idéntico a A4: actualizar la sustancia afectada (p. ej. `compromiso` → incumplimiento; `flujo_recurso` → proyección no cumplida), recomputar el **lado observado** de la `brecha`, **reemitir/cerrar la `expectativa`** vencida (no ajustar `trayectoria`). `sorpresa > umbral` → `perturbacion`; en caso contrario, cierre silencioso.

---

### 4.3 Rama transversal — Reproceso / re-anclaje de la misma realidad

Aplica a ambos flujos cuando una señal refiere un instante de mundo ya observado.
- Distinguir por los dos relojes: dos entradas con el mismo instante de mundo pero distinto instante de conocimiento son re-anclajes del mismo hecho de mundo, no dos hechos.
- **Misma procedencia + mismo instante de mundo + mismo contenido:** re-anclaje redundante; **no es evidencia nueva** y no infla confianza ni mueve frescura (INV-3/INV-4).
- **Misma procedencia + mismo instante de mundo + contenido distinto + corrección declarada:** **supersesión por superposición** — la previa se **deprecia** (no se borra), no se monta disyuntiva.
- **Procedencias distintas (o corrección no declarada) con contenido incompatible que sigue admisible:** **conflicto** → `creencia disyuntiva` / `conflicto persistente` (sin elegir arbitrariamente, sin promediar).
- Toda revisión respeta el Eslabón Débil: re-anclar con mejor evidencia puede subir confianza **solo si la nueva premisa lo sostiene explícitamente**, nunca por el mero paso del tiempo.

---

### 4.4 Las seis ramas y la condición de fin

**Ramas:** (1) **confirma** — `sorpresa ≤ umbral`: integra, no perturba. (2) **sorprende** — `sorpresa > umbral`: integra y deja `perturbacion`. (3) **vence** — expectativa con borde de mundo cruzado y no cumplida: ausencia observada → mismo gate de sorpresa. (4) **fuente en conflicto** — observaciones admisibles de procedencias distintas: `creencia disyuntiva` / `conflicto persistente`. (5) **tipo no catalogado** — `observacion inclasificable` + `apertura ontológica`. (6) **reproceso** — re-anclaje del mismo instante de mundo, distinguido por el reloj de conocimiento; correción declarada supersede, conflicto se representa.

**Condición de fin (única y verificable):**
- (F1) la(s) observación(es) del disparo están ancladas y selladas;
- (F2) estado sustantivo, lado observado de brechas y expectativas afectadas, recomputados y coherentes (Eslabón Débil satisfecho);
- (F3) por cada disparo con `sorpresa > umbral`, exactamente una `perturbacion` sellada en P-OUT; ninguna en caso contrario;
- (F4) el OSE no dejó ninguna inferencia causal, opción, recomendación, acción, `episodio`, `trayectoria` ni `brecha` generada (I-0 e INV-9 intactos);
- (F5) no quedan expectativas con borde cruzado sin resolver (solo Flujo B);
- (F6) no hay tarea pendiente: el motor vuelve a DORMIR.

---

## 5. Tabla de trazabilidad (cero conceptos nuevos)

| Elemento de esta especificación | Fuente literal en el canon |
|---|---|
| OSE = Ritmo de Comprensión + Vencimiento | Motor — Ritmo de Comprensión (constante); Motor — vencimiento como disparo de G0 |
| Frontera: no ATENDER / DIAGNOSTICAR / JUZGAR / ARTICULAR / RECONCILIAR | Arquitectura — los siete actos; definición del componente |
| Gates G0, G1, G2, G3 (y solo esos) | Motor — gates G0–G3 |
| P-IN (señal cruda) | Acto PERCIBIR (frontera de entrada) |
| P-CLK (avance del instante de mundo → vencimiento) | Motor — dos relojes; G0 por vencimiento; MOV — `expectativa` (horizonte) |
| P-OUT (`perturbacion`) | Tipo `perturbacion` (familia E); G3 |
| `perturbacion` = {clase, afectadas, magnitud, propagacion} | MOV — tipo `perturbacion` (clase, afectadas, magnitud, propagación) |
| propagación = entidades alcanzadas por dependencias (`vinculo`) | MOV — `vinculo` (dependencia/contención); Ley del Eslabón Débil (propagación) |
| Sello Epistémico {estatus, confianza, procedencia} | MOV — Sello Epistémico |
| Sello Temporal {mundo, conocimiento, validez, frescura} | MOV — Sello Temporal; Motor — dos relojes |
| INV-1 sellado obligatorio | MOV — "todo porta sello epistémico y temporal" |
| INV-2 etiqueta epistémica / observación = único HECHO | Constitución — etiqueta HECHO/INFERENCIA/HIPÓTESIS; MOV — observación única fuente de anclaje |
| INV-3 Eslabón Débil / no promoción silenciosa | MOV — Ley del Eslabón Débil; Motor — prohibida promoción silenciosa |
| INV-4 dos relojes / re-anclaje | Motor — dos relojes; MOV — Sello Temporal |
| INV-5 sorpresa vs modelo vigente | Arquitectura — COMPRENDER mide sorpresa; Motor — G2/G3 |
| INV-6 no-juicio (salida = perturbación) | Arquitectura — comprensión precede al juicio; definición del componente |
| INV-7 conflicto → creencia disyuntiva / conflicto persistente | MOV — conflicto de fuentes ya definido |
| INV-8a apertura ontológica / observación inclasificable | MOV — apertura ontológica / observación inclasificable |
| INV-8b vencimiento como disparo G0 | Motor — G0 incluye vencimiento; "el motor DUERME por defecto" |
| INV-9 corte con RECONCILIAR | Arquitectura — RECONCILIAR calibra tras el resultado de una decisión |
| Brecha solo lado observado (síntoma) | MOV — `brecha` (síntoma = distancia objetivo-estado); papel síntoma |
| `flujo_recurso` proyección de agotamiento → expectativa con horizonte | MOV — `flujo_recurso` (proyección de agotamiento); `expectativa` (horizonte) |
| Abstención (no atomicidad) | Constitución — derecho a abstenerse |
| Relatividad de rol (P-OUT no espera respuesta) | Constitución — relatividad de rol |
| Orden temporal sellado (sin aritmética de calendario) | MOV — causalidad/horizonte como relación de orden; Sello Temporal |
| Las seis ramas | Motor — confirma/sorprende; vencimiento; MOV — conflicto / apertura ontológica; dos relojes (reproceso) |

**Verificación de poda.** Se eliminaron todas las citas con número de sección (el canon no tiene secciones). Se eliminaron: la taxonomía "tipo de sorpresa (discrepancia/cobertura/caducidad)"; la enumeración cerrada de clases de perturbación; "candidato de foco" como artefacto; "idempotencia" y "monotonía del instante de conocimiento" como leyes; el invariante "no-doble-instanciación"; la maquinaria importada de RECONCILIAR (G8, contrafactual de rol, "cuatro cosas"); "escenario de ruptura", "restricción presunta no-localizada", "ambigüedad direccional", "confianza no evaluada", "alarma de vigencia", "perfil de decaimiento", "blindaje forma/contenido"; "módulos-sentido" y "primer principio"; la fórmula multiplicativa del vencimiento; los gates de actos vecinos (G0.5, G4, G5, G7, G8, G9) y el registro I-0…I-9 como aparato; los puertos de "lectura" y "escritura" como interfaces; el vocabulario de transporte/persistencia ("confirmar/commit/atomicidad", "fire-and-forget/síncrono/asíncrono/bloquea", "Ledger" como componente, "horas hábiles/calendario operativo", "entre dos lecturas/concurrente"). La contradicción de puertos se resolvió en favor de **tres** puertos. La contradicción de C2 se resolvió hacia la regla más restrictiva: **el OSE no escribe `trayectoria`**.

---

## 6. Cierre de alcance

> **El OSE mantiene el Modelo Operacional Vivo actualizado y verdadero, y nada más.** Grita "esto sorprende" (una `perturbacion`). No dice qué importa (ATENDER), por qué pasa (DIAGNOSTICAR), qué hacer (JUZGAR), a quién (ARTICULAR), ni si una decisión funcionó (RECONCILIAR). Hace lo mínimo, lo hace siempre, y deja todo lo demás explícitamente a su dueño.

### Apéndice de falsación — qué observación en la implementación real obligaría a revisar este componente

El OSE viola su especificación si la implementación permite **alcanzar** cualquiera de estos estados (cada uno es un test de refutación directo):

1. Una entidad del MOV con sello epistémico o temporal incompleto. *(INV-1)*
2. Una entidad con `estatus = HECHO` cuyo origen no es una observación. *(INV-2)*
3. Una entidad cuya confianza o frescura supera la de su premisa más débil. *(INV-3)*
4. Una creencia que sube de confianza por el mero reenvío de la misma fuente, o por el paso del tiempo, sin premisa entrante que lo sostenga. *(INV-3 / INV-4)*
5. Dos entradas con el mismo instante de mundo y procedencia tratadas como evidencia acumulada en vez de re-anclaje. *(INV-4)*
6. Una `expectativa` creada **después** de una observación para "explicar" su sorpresa. *(INV-5)*
7. Una salida del OSE que no sea de tipo `perturbacion` (un diagnóstico, una recomendación, una opción), o una `perturbacion` que porte prioridad/score/urgencia/ranking. *(INV-6)*
8. Una de dos observaciones en conflicto de procedencias distintas sobrescrita, promediada o elegida por el OSE. *(INV-7)*
9. Una observación de tipo no catalogado descartada o forzada a un tipo existente. *(INV-8a)*
10. Una `perturbacion` de vencimiento emitida sin que un borde de mundo sellado haya sido cruzado por el avance del instante de mundo, o emitida dos veces para el mismo vencimiento. *(INV-8b)*
11. **El OSE escribiendo o ajustando una `trayectoria` o una `relacion_causal`, o escribiendo un `episodio`, como producto de integración o de leer un vencimiento como veredicto de decisión.** *(INV-9)*
12. **Una aparición / llegada no modelada / `observacion inclasificable` que NO produjo `perturbacion` por carecer de expectativa previa** (el OSE debe medir sorpresa contra el modelo vigente, no exigir expectativa). *(INV-5)*
13. **Un cruce de referente de un `flujo_recurso`, previsible por su proyección de agotamiento vigente, que el MOV no registró porque ninguna `expectativa` con horizonte lo armaba.** *(A4 paso 3)*
14. El OSE realizando trabajo sin combustible externo (sin entrada por P-IN ni avance por P-CLK): un impulsor interno perpetuo. *(G0 / "el motor DUERME por defecto")*

Si la implementación real exhibe cualquiera de estos catorce estados, la especificación del OSE debe revisarse antes de construir sobre él.