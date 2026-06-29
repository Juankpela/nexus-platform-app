# Arquitectura Cognitiva de NEXUS
### Cómo NEXUS construye comprensión de una operación

> Documento gobernante de horizonte 10 años. No describe software. Describe la mente.
> Reconstruido desde primeros principios. **No parte de C1–C5 ni de la implementación actual**; los compara solo al final, para ver si emergen de forma natural o si fueron errores.
> Regla de validez de toda decisión aquí: *seguiría siendo correcta aunque en cinco años cambiáramos por completo el modelo de IA.* Si no, está mal escrita.
> Criterio de éxito (enmendado y aceptado): la arquitectura debe producir juicios **consistentes, explicables y útiles para el rol** — no "mejores que un humano promedio", afirmación que hoy no se puede validar y que distorsionaría el diseño.

---

## 0. Advertencia de método

Este documento se escribe contra el instinto de defender lo construido. Su único deber es **proteger al producto de fundamentos incorrectos**, aunque el fundamento incorrecto sea un documento que yo mismo escribí antes. Por eso prohíbo aquí dos cosas: (a) empezar por la arquitectura actual y racionalizarla, y (b) tratar la "decisión" como punto de partida. Empezamos por una pregunta anterior a la decisión.

---

## 1. La pregunta primera: ¿qué significa comprender una operación?

La mayoría de los sistemas saltan de *percibir datos* a *recomendar acciones*. Entre esos dos actos falta el más importante, y es invisible porque no produce salida: **comprender.** Un sistema que recomienda sin comprender es una cadena de reflejos con buena redacción. Por eso esta es la primera obligación.

Comprender una operación **no** es:
- tener sus datos (eso es *registro*),
- notar que algo se repite o se desvía (eso es *detección de patrón*),
- ni siquiera saber qué hacer (eso es *decisión*).

Comprender una operación es **sostener un modelo de ella capaz de responder, sin que nadie lo pregunte, cuatro cosas:**

1. **¿Por qué el estado actual es como es?** — un relato **causal** del presente. (No "las visitas se atrasan", sino "las visitas se atrasan *porque* la zona norte está subdimensionada en la franja pico".)
2. **¿Hacia dónde va si nada cambia?** — una **proyección** de la trayectoria. (Comprender incluye anticipar; un modelo que no predice no comprende, solo describe.)
3. **¿Cuánto se aparta de donde debería estar?** — una **brecha normativa**: la distancia entre lo que ocurre y lo que el negocio considera "bueno". Sin un referente de "bueno", no hay comprensión, solo crónica.
4. **¿Qué lo cambiaría?** — los **puntos de palanca**: qué intervención, sobre qué causa o restricción, alteraría la trayectoria. Comprender es saber dónde empujar.

> **Definición.** Comprender una operación = mantener un modelo causal, normativo y predictivo de ella, **continuamente reconciliado con la realidad**, que explica el presente, anticipa el futuro, localiza la brecha y señala la palanca.

La medida de la comprensión no es cuántos datos tiene el sistema, sino **cuán pocas veces la realidad lo sorprende** — y, cuando lo sorprende, cuán rápido el modelo se corrige. Comprensión = sorpresa minimizada sobre una operación. Esta es la pieza que, si se diseña mal, condena todo lo demás. Todo el resto del documento es consecuencia de tomarse en serio esta definición.

---

## 2. El objeto fundamental: el Modelo Operacional Vivo

Si comprender es sostener un modelo, entonces el **objeto central de NEXUS no es la decisión ni el evento: es el Modelo Operacional Vivo** (en adelante, *el Modelo*) — la representación interna del estado de la empresa que NEXUS mantiene y reconcilia sin descanso. Las decisiones son **consultas** que se le hacen al Modelo cuando revela una brecha que alguien puede cerrar. El Modelo es el sustantivo; decidir es el verbo.

El Modelo no es una base de datos del presente. Tiene cuatro componentes, y los cuatro son indispensables:

**(a) Las entidades y su estado** — qué existe y cómo está ahora (clientes, técnicos, trabajos, dinero, activos). Es el "qué". Es lo más fácil y lo menos valioso: por sí solo es registro, no comprensión.

**(b) La estructura causal** — las relaciones de influencia entre entidades: *qué mueve qué.* "Una segunda visita destruye el margen del trabajo." "Un técnico sin el repuesto correcto no cierra." "Un SLA vencido erosiona la retención del cliente grande." Esta estructura es lo que permite pasar de *ver* a *entender*. Sin ella, todo es correlación; con ella, hay causa.

**(c) El referente normativo (los objetivos)** — qué significa "bueno" para *esta* empresa. No es universal: para un tenant es margen, para otro velocidad, para otro no perder la cuenta grande. El referente convierte una observación en una **brecha**. Sin referente no hay brecha; sin brecha no hay nada que comprender ni priorizar.

**(d) La trayectoria esperada** — qué predice el Modelo que ocurrirá. Es lo que hace posible la *sorpresa*: cuando la realidad se aparta de lo esperado, hay algo que el Modelo aún no comprende, y eso dispara el aprendizaje.

### 2.1 Síntoma, causa y restricción — tres papeles distintos en el Modelo

Comprender exige no confundirlos. Son tres roles diferentes dentro del Modelo:

- **Síntoma:** una brecha *observada* — una desviación que se manifiesta. ("Suben los incumplimientos de SLA.") Vive en el componente (a)+(c): es estado contra referente.
- **Causa:** el elemento *aguas arriba* en la estructura causal (b) cuyo estado produce el síntoma. ("La zona norte está subdimensionada en la franja pico.") Se halla **trazando el grafo causal hacia atrás** desde el síntoma. Una causa se *corrige*.
- **Restricción:** un **límite estructural** que acota el comportamiento de *toda* la operación, no de un síntoma. ("Solo dos técnicos están certificados para el equipo X.") Una restricción no es la causa de un síntoma puntual; es el *limitador permanente* que determina **qué causas son siquiera posibles y qué intervenciones son factibles**. Una restricción no se corrige: se **gestiona alrededor** o se **invierte en levantarla**.

El error cognitivo más común y más caro es tratar un síntoma como causa (apagar incendios) o una restricción como causa (intentar "arreglar" lo que en realidad es un límite estructural). Comprender es, sobre todo, **ubicar correctamente cada cosa en uno de estos tres papeles.**

### 2.2 Causalidad: los tres niveles

El Modelo no representa "lo que ocurre junto", sino **influencia dirigida**. Debe poder responder en tres niveles, y la comprensión vive en los dos últimos:

1. **Asociación** — "A y B tienden a ocurrir juntos." (Nivel de los datos. No es comprensión.)
2. **Intervención** — "si actúo sobre A, B cambia así." (Aquí empieza comprender: permite recomendar.)
3. **Contrafactual** — "si *hubiéramos* hecho A en vez de B, habría pasado esto." (El nivel más alto: permite evaluar decisiones y aprender de lo que no se hizo.)

Un sistema atrapado en el nivel 1 puede ser muy preciso describiendo y aun así no comprender nada. Toda la utilidad operativa de NEXUS vive en los niveles 2 y 3.

### 2.3 Objetivos y conflicto

Los objetivos son el referente normativo (c). Se representan como un conjunto pequeño de **bienes operativos** (caja cobrada, capacidad utilizada, cliente retenido, riesgo acotado, margen), cada uno con una dirección y un peso propio del tenant. Los conflictos no se resuelven con una jerarquía fija, sino con tres reglas:

1. **Las restricciones duras son inviolables y no se negocian** (ley, seguridad, integridad del dinero). Son compuertas, no bienes que se intercambian.
2. **Entre bienes blandos, manda la restricción que ata en ese momento.** (Si el cuello de botella es capacidad, optimizar capacidad domina y lo demás se subordina; cuando el cuello se mueve, cambia la prioridad.)
3. **El rol y el horizonte modulan el peso.** El objetivo del técnico ahora es cerrar bien y seguro; el del dueño es la trayectoria y el riesgo. El mismo bien pesa distinto según quién mira.

Regla de transparencia: cuando dos bienes blandos **genuinamente** chocan y no hay una respuesta calculable, el sistema **no elige en silencio**: expone el trade-off. Eso es lo que hace al juicio *consistente y explicable* en vez de arbitrario.

---

## 3. Las capas cognitivas irreducibles

Pregunté: ¿cuáles son las capas mínimas para que la realidad operacional se convierta en un juicio útil? La respuesta no es una lista de módulos. Es **una sustancia y los actos que se ejecutan sobre ella.** Esta es la clasificación que descubrí, y es mejor que la lista de referencia (percepción/comprensión/atención/juicio/memoria) porque revela qué es estado y qué es operación.

### La sustancia: el Modelo Operacional Vivo (§2)
Es lo que el sistema **ES** en cada instante. Tres estratos: **Hechos** (lo observado), **Comprensión** (el significado: causal + normativo + brecha + trayectoria) y **Historia** (lo vivido). Todos los actos leen y escriben sobre esta sustancia. La comprensión es el estrato central y es el que la arquitectura actual no tiene como objeto persistente (lo veremos en §7).

### Los seis actos cognitivos
Cada acto tiene **una sola responsabilidad** y **una razón para existir** que ningún otro acto cubre:

1. **PERCIBIR** — *frontera de entrada.*
   Responsabilidad única: convertir eventos crudos en **hechos tipados y confiables**, con procedencia y frescura. Establece *qué es el caso*. Razón de existir: sin un límite que separe señal de ruido y que selle la procedencia, el Modelo se llena de ficción. No interpreta; solo da fe.

2. **COMPRENDER** — *el acto que mantiene la sustancia.*
   Responsabilidad única: integrar cada hecho nuevo en el Modelo — actualizar estado, relaciones causales, brecha y trayectoria — y **registrar la sorpresa** cuando el hecho contradice lo esperado. Razón de existir: es el único acto cuyo producto no es una salida sino **un mejor entendimiento**. Es la capa que la mayoría de los sistemas omiten y la que esta arquitectura pone en el centro. Aquí —y solo aquí— se distingue síntoma de causa de restricción.

3. **ATENDER** — *control sobre la sustancia.*
   Responsabilidad única: dado un Modelo rico en brechas, decidir **qué merece pensamiento ahora**, asignando un foco finito por impacto × urgencia × tratabilidad × relevancia-de-rol. Razón de existir: sin atención, el sistema o se ahoga (todo importa) o se fija (siempre lo mismo). Atender es la forma operativa de la racionalidad limitada: no se razona sobre todo, se razona sobre lo que más cambia el resultado.

4. **DIAGNOSTICAR** — *consulta causal sobre la sustancia.*
   Responsabilidad única: para una brecha atendida, determinar **por qué**, trazando la estructura causal hacia atrás hasta una causa (distinguida de síntoma y de restricción), de forma derrotable y fundamentada. Razón de existir: recomendar sin diagnosticar es tratar el síntoma. El diagnóstico es lo que hace que la acción ataque la causa.

5. **JUZGAR** — *consulta deliberativa sobre la sustancia.*
   Responsabilidad única: generar intervenciones candidatas, **proyectar sus consecuencias a través del Modelo** (nivel intervención/contrafactual), sopesarlas contra los objetivos y el costo de error, y comprometerse con una recomendación — o **abstenerse**. Razón de existir: convierte comprensión-de-causa en una elección defendible. Subsume generar hipótesis y comparar alternativas.

6. **ARTICULAR** — *frontera de salida.*
   Responsabilidad única: proyectar el fragmento pertinente del Modelo y del juicio **al rol que puede actuar**, en su lenguaje, su esfera y su horizonte. Razón de existir: una comprensión que no puede transmitirse a quien actúa es inerte. La articulación no es cosmética: es la condición para que el entendimiento se vuelva acción.

7. **RECONCILIAR** — *el acto que cierra el tiempo.*
   Responsabilidad única: comparar lo **predicho** con lo **ocurrido** (y con el contrafactual humano: aceptó / modificó / rechazó), y con esa diferencia **corregir el Modelo y recalibrar la confianza** de sus relaciones causales y de sus patrones de juicio. Razón de existir: es lo que hace que la comprensión sea *verdadera* y no *supuesta*. Sin reconciliación, el Modelo envejece hacia la fantasía y nada se aprende.

**Por qué siete y no más:** Percibir y Articular son las dos fronteras (entrada/salida). Comprender mantiene la sustancia. Atender, Diagnosticar, Juzgar son las tres operaciones internas (seleccionar, explicar causa, elegir acción). Reconciliar es el cierre temporal. No encontré un acto necesario que no caiga en uno de estos siete, ni uno de estos siete que pueda eliminarse sin que el sistema deje de comprender o de actuar. La reducción a su núcleo irreducible está en §6.

---

## 4. El flujo: cómo la comprensión se vuelve juicio

No es una tubería de petición→respuesta. Es **un Modelo que vive y dos ritmos que lo recorren.**

- **Ritmo de comprensión (constante, silencioso):** cada hecho que entra → PERCIBIR → COMPRENDER. El Modelo se actualiza siempre, produzca o no una recomendación. La mayor parte del tiempo NEXUS solo está *entendiendo mejor*, sin decir nada. Esto es lo que un sistema decisión-céntrico no hace: solo se "enciende" cuando hay que decidir, y por eso nunca comprende, solo reacciona.

- **Ritmo de juicio (intermitente, disparado por brecha):** cuando ATENDER detecta que una brecha cruza el umbral de lo que importa → DIAGNOSTICAR su causa → JUZGAR la intervención → ARTICULAR al rol. Produce una recomendación.

- **Cierre (diferido):** cuando la realidad responde → RECONCILIAR contra lo predicho → corregir el Modelo. El cierre alimenta de vuelta al ritmo de comprensión.

La diferencia esencial con cualquier diseño anterior: **el juicio es una consecuencia de la comprensión, no su punto de partida.** NEXUS no "toma decisiones y a veces entiende"; **entiende siempre y a veces decide.** Una recomendación es lo que ocurre cuando un Modelo bien mantenido encuentra una brecha que un rol puede cerrar.

---

## 5. Respuestas directas a las diez preguntas

1. **¿Qué es una operación / qué modelo interno mantiene NEXUS?** Una operación es un sistema que mantiene su viabilidad contra perturbaciones persiguiendo unos bienes bajo restricciones. NEXUS mantiene de ella el **Modelo Operacional Vivo** (§2): estado + causalidad + objetivos + trayectoria.
2. **¿Cómo percibe la realidad?** El acto PERCIBIR convierte eventos en hechos tipados con procedencia; COMPRENDER los integra al Modelo. Lo que transforma eventos aislados en estado coherente es la **integración contra el Modelo existente** (cada hecho se interpreta a la luz de lo que ya se entiende, y genera *sorpresa* si contradice).
3. **¿Cómo construye comprensión / distingue síntomas, causas, restricciones / representa causalidad?** §2.1 y §2.2: trazando el grafo causal (síntoma=brecha observada; causa=origen aguas arriba; restricción=límite estructural) y representando influencia dirigida en tres niveles (asociación/intervención/contrafactual).
4. **¿Cómo dirige su atención?** El acto ATENDER rankea las brechas del Modelo por impacto × urgencia × tratabilidad × relevancia-de-rol. No razona sobre todo: razona sobre lo que más mueve el resultado para quien puede actuar.
5. **¿Cómo representa objetivos y resuelve conflictos?** §2.3: bienes operativos con pesos del tenant; restricciones duras inviolables; entre bienes blandos manda la restricción que ata; rol y horizonte modulan; los choques genuinos se exponen, no se resuelven en silencio.
6. **¿Cómo diagnostica?** Proceso intelectual, no algoritmo: ante una brecha atendida, abducir la causa más plausible trazando la estructura causal hacia atrás, descartando síntomas y restricciones, exigiendo evidencia para cada eslabón, y dejando el diagnóstico **derrotable** (revisable si llega evidencia contraria).
7. **¿Cómo genera hipótesis y distingue certeza/inferencia/posibilidad?** JUZGAR genera intervenciones candidatas; cada afirmación del razonamiento se **etiqueta por estatus epistémico**: *hecho* (observado), *inferencia* (derivado del Modelo), *hipótesis* (posible, sin evidencia aún). Mezclarlos está prohibido (§9).
8. **¿Cómo evalúa alternativas?** Proyectando cada candidata **a través del Modelo** (qué pasaría si se interviene así), comparando su consecuencia esperada contra los objetivos y el **costo de equivocarse**, y eligiendo la de mejor balance — o absteniéndose si ninguna supera el umbral de evidencia.
9. **¿Cómo justifica cada conclusión?** Toda conclusión es trazable hasta los hechos del Modelo a través de una cadena explícita marco→evidencia→causa→proyección→elección. Una conclusión que no se puede reconstruir es **inválida**, aunque sea correcta (§9).
10. **¿Qué cambia tras cada decisión y qué nunca cambia?** *Cambia:* la calibración del Modelo (confianza en relaciones causales y en patrones de juicio), la historia, los priores de atención, el contenido. *Nunca cambia:* la forma — la disciplina de fundamentación, el bucle de reconciliación, la separación epistémica, las restricciones inviolables, la relatividad de rol y el principio de que **la comprensión precede al juicio.**

---

## 6. Reality Check: destruir la arquitectura

Intento eliminar todo lo prescindible y quedarme con lo irreducible.

**¿Qué es consecuencia de otra cosa (y por tanto no es primitivo)?**
- *Percibir* es la frontera de entrada del Modelo; *Articular* es su frontera de salida. Son necesarios pero **derivados** del Modelo: existen *porque* hay un Modelo que alimentar y proyectar.
- *Diagnosticar* y *Juzgar* son **consultas** a la estructura causal del Modelo. No son sustancias nuevas: son usos del Modelo. Si el Modelo es rico, diagnosticar y juzgar son operaciones sobre él, no piezas independientes.
- *Atender* es una función de control **sobre las brechas del Modelo**: presupone el referente normativo.

**¿Qué queda cuando quito lo derivado? — El conjunto mínimo irreducible (cinco principios):**

1. **Un Modelo causal, normativo y predictivo de la operación.** (Sin él no hay comprensión, solo reacción.) — *El corazón.*
2. **Un bucle de reconciliación con la realidad.** (Sin él, el Modelo se vuelve fantasía y nada es confiable ni se aprende.) — *Lo que hace verdadera a la comprensión.*
3. **Un referente normativo (objetivos).** (Sin él se describe pero no se juzga: no hay brecha ni prioridad.)
4. **Una disciplina de fundamentación** — cada elemento del Modelo y cada juicio trazable a observación, con estatus epistémico explícito y derecho a abstenerse. (Sin ella el Modelo es ficción incontestable.)
5. **La relatividad de rol** — comprender es relativo a quién puede actuar; un entendimiento que no se proyecta a un actor es inerte.

Todo lo demás —percepción, atención, diagnóstico, juicio, articulación como capas separadas— **emerge** de estos cinco. Son la forma en que estos cinco principios se ejercen, no principios adicionales.

**¿Qué es razonamiento y qué es implementación?**
- *Razonamiento (perdura 10 años):* el Modelo, los cinco principios irreducibles, los siete actos como funciones, la separación síntoma/causa/restricción, los tres niveles de causalidad.
- *Implementación (reemplazable):* **cómo** se estiman las fuerzas causales, **cómo** se generan las intervenciones candidatas, **cómo** se puntúa numéricamente la atención, **cómo** se produce el texto de la articulación. Esto es el *motor que anima los actos*, y es exactamente lo que un mejor modelo de IA reemplazará algún día.

**¿Qué desaparece si cambiamos completamente la IA?** Nada de la arquitectura. Solo el motor. El Modelo, los cinco principios y los siete actos son afirmaciones sobre **la operación y el operador humano**, no sobre la máquina que los ejecuta. Esa es la prueba superada: la mente perdura; el motor que la anima es tejido reemplazable.

---

## 7. Comparación final con la arquitectura actual (C1–C5)

Ahora —y solo ahora— comparo. Sin forzar coincidencias. Con la obligación explícita de señalar errores, incluido el de mi documento anterior.

**Hallazgo central: la arquitectura actual es un *pipeline de decisión sin sustrato de comprensión*.** C1–C5 describe muy bien **cómo se toma y se cierra una decisión**, pero no mantiene un Modelo Operacional Vivo persistente. Razona *por decisión*, no *sobre la operación*. Esa es la incompletitud que esta reconstrucción expone, y es exactamente el riesgo que el founder intuía: *"una cadena de decisiones sin entendimiento."*

| Pieza actual | Veredicto | Razón |
|---|---|---|
| **C1 Situation Framing** | ⚠️ **Debe cambiar (promoverse).** | Hoy enmarca *una situación para una decisión* y es efímero. La arquitectura correcta exige que el encuadre sea la cara visible de un **Modelo persistente** (COMPRENDER, §3). C1 debe dejar de ser "enmarcar para decidir" y convertirse en "mantener el Modelo". Es el cambio más importante. |
| **C2 Decision Contract** | ✅ **Validado**, pero **degradado de rango.** | El contrato (opción + justificación + evidencia + confianza + resultado esperado) es correcto y emerge naturalmente como el producto de JUZGAR + ARTICULAR. Pero **no es el átomo**: es una *consulta al Modelo*. Mi documento anterior lo puso en el centro; eso fue un error de jerarquía. El átomo es el Modelo; la decisión es su consecuencia. |
| **C3 Bounded Autonomy** | ✅ **Validado.** Emerge naturalmente. | Es la cota legítima sobre JUZGAR: cuánto puede actuar un juicio según su confianza reconciliada. No es capa propia; es una propiedad del acto de juzgar. Correcto. |
| **C4 Outcome Linkage** | ✅ **Validado y elevado.** | Es exactamente RECONCILIAR (§3, principio irreducible #2). La arquitectura confirma que es indispensable. Más aún: la nueva visión le da un trabajo mayor — no solo evaluar la decisión, sino **corregir el Modelo**. |
| **C5 Operational Memory** | ✅ **Validado**, con matiz. | Es el estrato *Historia* de la sustancia. Correcto que exista. Matiz: la memoria que importa no es el archivo de decisiones, sino **la calibración del Modelo** que la reconciliación deja sedimentada. La memoria es el Modelo que recuerda, no un registro aparte. |
| **Decision Ledger** | ✅ **Validado** como infraestructura. | Sigue siendo el sustrato de auditabilidad y de la disciplina de fundamentación (principio #4). Correcto que no sea una capacidad. |
| **Lo que SOBRA / falta** | — | **Falta** la capa de COMPRENDER como objeto persistente (el Modelo Operacional Vivo): es el hueco. **Sobra** tratar la decisión como unidad fundacional: es derivada. **Falta** un acto de ATENDER explícito: hoy la priorización está implícita en el despacho, no es una función cognitiva de primera clase sobre las brechas del Modelo. |

**Qué emerge de forma natural:** C2, C3, C4, C5 y el Ledger emergen casi sin fricción como, respectivamente, el producto de juzgar, la cota de la autonomía, el acto de reconciliar, el estrato de historia y la infraestructura de fundamentación. **Eso valida que el trabajo previo no fue un error** — fue un **edificio correcto sin cimiento explícito**.

**Qué fue error:** poner la decisión como átomo (mi documento anterior, *Constitución Cognitiva*) y dejar la comprensión como un paso efímero dentro del encuadre (C1). No es que estuviera mal construido; es que **se construyó la planta antes que el sótano**. La corrección no es demoler: es **insertar el sustrato de comprensión debajo de lo ya validado**, y reordenar la jerarquía para que la decisión vuelva a su sitio: consecuencia, no origen.

---

## 8. Criterio de éxito y la única pregunta

Este documento se considera logrado si permite responder una sola pregunta:

> **¿Cómo construye NEXUS una comprensión del estado operacional para emitir diagnósticos y recomendaciones consistentes, explicables y útiles para cada rol?**

Respuesta, en una frase: **NEXUS mantiene un Modelo causal, normativo y predictivo de la operación, lo reconcilia sin descanso con la realidad para que la sorpresa lo corrija, dirige su atención a las brechas que más importan a quien puede actuar, y solo entonces diagnostica, juzga y se explica — de modo que toda recomendación es la consecuencia trazable de una comprensión, no un reflejo sin entendimiento.**

Si esta arquitectura pudiera reemplazar la implementación actual sin cambiar su esencia —insertando el sustrato de comprensión bajo el pipeline de decisión ya validado— el objetivo se cumple. Lo cumple: nada de C2–C5 se descarta; todo encuentra su lugar como consecuencia de un cimiento que antes era implícito y ahora es explícito.

---

## Apéndice — Falsación de esta propia arquitectura

Deber de intentar destruirla. Tres formas en que podría estar equivocada, y qué lo demostraría:

- **Riesgo del Modelo "demasiado rico":** *si* mantener un Modelo causal persistente exige conocimiento causal que la operación real nunca provee con suficiente densidad, *entonces* el Modelo sería en su mayoría hipótesis no fundamentadas — y por la disciplina #4 tendría que abstenerse casi siempre, volviéndose inútil. **Refutador:** medir, en operación real, qué fracción de las relaciones causales del Modelo alcanza evidencia suficiente. **Mitigación de diseño:** el Modelo empieza pequeño (pocas causas bien fundadas) y crece solo por reconciliación; no se postula completo. La teoría empieza cuando hay filas.
- **Riesgo del cierre (compartido con todo el programa):** *si* la realidad rara vez devuelve el resultado observable y el contrafactual humano, RECONCILIAR queda hueco, el Modelo no se corrige y la "comprensión" es solo una postulación elegante. **Este es el riesgo más grave.** **Refutador:** fracción de juicios que llegan a tener outcome reconciliado. Debe vigilarse desde el primer cliente.
- **Riesgo de sobre-arquitectura:** *si* en la práctica un operador HVAC PYME se resuelve con detección de síntomas + reglas simples, *entonces* el Modelo causal sería peso muerto que no cambia ninguna recomendación. **Refutador:** comparar recomendaciones derivadas del Modelo causal contra reglas simples sobre síntomas; si no difieren en valor para el cliente, el Modelo sobra. — Esta es la prueba más dura y la que más honestamente debe hacerse antes de invertir en construir el sustrato de comprensión.

Ninguno de estos riesgos se resuelve teorizando más. Se resuelven **operando con clientes reales** y observando cuál hipótesis sobrevive. Esta arquitectura define la **forma** de la mente; solo la operación dirá cuánto de esa forma merece llenarse de contenido. Y solo evidencia de cliente —jamás la intuición— puede reabrir este diseño.
