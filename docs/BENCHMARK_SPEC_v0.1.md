# Especificación del Benchmark de Supervisión Operacional — v0.1 (plano metodológico)

> **Naturaleza.** Plano metodológico de un **benchmark de simulación** para poner a prueba —intentando FALSAR— la hipótesis del Protocolo. No genera datos, escenarios, tablas, métricas, IA ni producto: solo define **qué debe contener un benchmark serio** para que sea auditable por un tercero **antes de generar un solo dato**. Éxito = un benchmark donde **una hipótesis falsa tiene alta probabilidad de ser destruida.** Fecha: 2026-06-30.
>
> **Límite epistémico (gobierna todo).** Un mundo artificial **no puede confirmar** la hipótesis para la realidad (lo construimos nosotros → riesgo de circularidad/sesgo del diseñador). El benchmark **falsa barato, mapea fronteras y calibra el instrumento.** No sustituye el experimento de campo prospectivo (Protocolo, Gates 1–2). Un resultado positivo es **necesario, no suficiente.**

## 1. Objetivo científico
- **Responde:** ¿bajo qué condiciones operacionales, y en qué magnitud, la **protección temprana de compromisos reversibles** —ejecutada por un supervisor con información acotada— preserva más valor que la misma operación sin ese supervisor? ¿Existe algún régimen plausible donde **no** ayude o **destruya** valor?
- **NO responde:** si la hipótesis se cumple en el mundo real (brecha de realismo → campo); si un operador adoptaría/confiaría/actuaría; si NEXUS-el-producto funciona; la viabilidad económica/comercial. El benchmark prueba la **lógica del mecanismo y sus fronteras en simulación**, no la empresa.

## 2. Alcance
- **Modelable ahora:** operaciones **estructuradas por compromisos** (compromisos discretos con condición, plazo, consecuencia), **acotadas por recursos finitos**, con **ventanas de reversibilidad en principio observables** (existe un punto de no retorno detectable del estado). Campo: field service, logística, instalaciones, servicios técnicos, facilities.
- **NO modelable aún:** operaciones sin condición/plazo claros (creativas, I+D, relación) → no hay ventana que proteger; operaciones dominadas por shocks exógenos inaccionables (puro azar); operaciones donde el valor es intrínsecamente incognoscible; multi-organización/adversariales (game-theoretic). *Justificación:* o carecen de la estructura que la hipótesis requiere, o añaden confounds que harían un resultado nulo ininterpretable.

## 3. Unidad experimental
**La OPERACIÓN-RUN** (una operación simulada completa sobre un horizonte) — porque la hipótesis compara **operaciones**, y el valor preservado es un agregado de nivel operación. El **compromiso** es la sub-unidad donde el mecanismo actúa (locus), pero no el veredicto.
**Diseño pareado (clave):** el mismo mundo generado (mismo seed, mismos compromisos, mismos shocks) se corre bajo **ambos brazos** (con supervisión / sin supervisión); la única diferencia es la política. La **operación-par** es la unidad de comparación → elimina la varianza-del-mundo como confound. *Esto es lo que la realidad NO puede dar (no se vive el mismo día dos veces) y es la ventaja única de la simulación.* No la alerta/recomendación/decisión (salidas del mecanismo, no valor); no el recurso/evento/estado (sub-componentes).

## 4. Variables (inventario, con leakage)
> **Disciplina anti-leakage (núcleo):** la política de supervisión consume SOLO **observables y derivadas-de-observables, evaluadas en el instante t**. NUNCA variables ocultas (duración real, shocks futuros, valor real) ni estado futuro. El motor del mundo y la política son **procesos separados**; la política recibe una "vista" = {observables a t} y nada más.

- **Observables** (visibles al supervisor en t): existencia/condición/plazo del compromiso (conocido al crear; leakage bajo) · estado actual (progreso, recurso asignado, status; continuo; leakage bajo) · asignación/agenda *declarada* del recurso (continuo; **leakage MEDIO** si la "agenda futura" se expone como certeza cuando es incierta) · señales de valor/prioridad observadas.
- **Ocultas** (existen en el mundo, NO visibles en t): **duración real** del trabajo (solo hay estimado; **leakage ALTO** si la política la usa) · **disponibilidad futura real** del recurso (avería, ausencia; ALTO) · **valor-en-riesgo real** (a menudo incognoscible incluso ex-post) · **shocks programados** en el mundo (cancelación, clima; ALTO).
- **Derivadas** (computadas de observables — el razonamiento del supervisor): punto de no retorno proyectado (plazo − duración estimada − disponibilidad) · ventana · clasificación de riesgo · acción recomendada. *Chequeo:* una derivada solo puede usar observables-en-t; jamás verdad oculta/futura.
- **Desconocidas/no modeladas:** el contrafactual real (en sim SÍ lo conocemos — corriendo ambos brazos; su poder) · efectos de segundo orden (proteger A mata B) → deben **modelarse** (contención de recurso), no dejarse desconocidos · la **brecha de realismo** (sim ≠ realidad) → fundamentalmente desconocida, la amenaza más profunda.

## 5. Fuentes de incertidumbre (inventario exhaustivo)
Un benchmark serio debe incluir suficientes de estas para que una política ingenua de "proteger todo temprano" NO gane trivialmente:
- **Estimación:** duraciones erróneas · valor mal estimado (ambas direcciones) · disponibilidad de recurso optimista/inflada.
- **Eventos estocásticos:** cancelaciones · llegada de nuevos compromisos · fallas de recurso (ausencia, avería, repuesto faltante) · shocks exógenos (clima, tráfico, proveedor, regulación) · re-priorización (el valor de un compromiso cambia: el cliente grande escala/desescala).
- **Calidad de información:** incompleta · demorada (estado rancio) · ruidosa/errónea · **compromisos no registrados** (invisibles a la política — sesgo de registro).
- **Acción:** la acción puede **fallar** (el recurso reasignado también falla) · tiene **costo/efecto lateral** (reasignar A retrasa B — contención) · tiene **latencia** (si llega tarde, no surte efecto) · **disponibilidad variable** (slack: a veces no hay a quién reasignar).
- **Supervisor (en variantes con humano):** varianza de habilidad (experto/novato) · cumplimiento (recomendaciones ignoradas) · fatiga de alerta · tolerancia a falsos positivos.
- **Estructural:** dependencias entre compromisos (cascadas) · recursos compartidos (contención) · carga variable en el tiempo (picos) · distribución de valor heterogénea (Pareto).
- **Medición:** el valor preservado se mide con error · ruido de atribución.
> *Punto científico:* con costo de acción, contención y ruido de estimación, **sobre-supervisar puede DESTRUIR valor** (perseguir falsos positivos, matar B por A). Las incertidumbres son lo que hace el test **justo** — crean regímenes donde la supervisión hiere.

## 6. Taxonomía de operaciones (propia)
Ejes que determinan si la supervisión puede ayudar: **holgura** (abundante↔saturada) · **acoplamiento** (independiente↔cascada) · **volatilidad** (estable↔turbulenta) · **observabilidad** (transparente↔opaca) · **concentración de valor** (uniforme↔Pareto) · **reversibilidad** (ventanas largas↔nulas).
Regímenes (deben coexistir en el benchmark): **(R1) Holgada-transparente** (la supervisión es fácil pero redundante: el operador ya lo ve) · **(R2) Tensa-observable** (ve pero no puede actuar — *debe FALLAR*) · **(R3) Opaca-holgada** (no lo ve pero podría actuar — *el sweet spot donde debe GANAR*) · **(R4) Acoplada-volátil** (cascadas + shocks — estrés; info parcial puede empeorar) · **(R5) Caótica** (cambia más rápido que el ciclo de supervisión → recomendación rancia — *debe FALLAR*) · **(R6) Irreversible-dominante** (ventanas nulas → detecta tarde por naturaleza — *debe FALLAR*).

## 7. Taxonomía de compromisos (propia)
Ejes: valor expuesto · longitud de ventana · detectabilidad de la deriva · accionabilidad · acoplamiento · volatilidad del valor.
Tipos: **(C1) Protegible** (alto valor + ventana larga + deriva detectable + acción factible) — *el único que la supervisión puede salvar* · **(C2) Detectable-pero-fatal** (se ve, sin acción/slack) · **(C3) Súbito** (falla sin aviso) · **(C4) Trivial** (bajo valor — riesgo de falso positivo) · **(C5) Volátil-de-valor** (el valor cambia; mal estimar hiere) · **(C6) Acoplado** (nodo de cascada). *La fracción C1 es un parámetro oculto clave: si es pequeña, la hipótesis falla aun con supervisión perfecta.*

## 8. Taxonomía de fallas (cómo una operación real destruye valor — sin pensar en NEXUS)
(1) incumplimiento por **atención tardía** (reversible-y-perdido) · (2) por **falta de recurso** (visto, sin slack) · (3) **súbito** (sin aviso) · (4) en **cascada** · (5) por **sobre-compromiso** (capacidad excedida — upstream) · (6) **mala asignación** (recurso en bajo valor mientras alto valor deriva) · (7) **retrabajo/calidad** · (8) por **información** (acción sobre dato malo) · (9) por **evento externo** · (10) por **error humano** · (11) **erosión lenta** (sin punto de no retorno).
> El benchmark debe incluir TODAS. La supervisión solo ataca (1) y (6). Si (2,3,5,7,9,10,11) dominan el valor destruido, la hipótesis falla. Esa es la medición justa.

## 9. Condiciones donde la supervisión NO puede aportar valor (obligatorio)
La hipótesis **debe fracasar** en: (1) **sin holgura** (saturación → nada que reasignar) · (2) **ventanas nulas/instantáneas** · (3) **operación transparente y simple** (sin brecha saliencia-riesgo → redundante) · (4) **volatilidad extrema** (recomendación rancia → valor cero o negativo) · (5) **valor uniforme y bajo** (sin concentración → el ranking no aporta) · (6) **fallas exógenas/irreversibles dominantes** · (7) **costo de acción alto / acciones poco confiables** (actuar sobre flags = NETO NEGATIVO) · (8) **información muy demorada/ruidosa** (acciones equivocadas) · (9) **sobre-compromiso estructural** (problema upstream). **Si la supervisión "gana" también aquí, el benchmark está amañado.** A priori la supervisión debería ganar en ~1–2 de los 6 regímenes y empatar/perder en el resto.

## 10. Amenazas a la validez (Red Team)
- **Leakage:** política usando ocultas/futuras. *Mitigación:* frontera de información estricta (solo observables-en-t), motor y política como procesos separados, auditoría de los inputs de la política.
- **Circularidad:** la "falla" del mundo computada del mismo modelo que la política usa para predecirla. *Mitigación:* la dinámica del mundo (qué causa fallar) generada por un **proceso distinto** al razonamiento de la política; idealmente especificada por un tercero ciego a la política.
- **Sesgo del diseñador (la más profunda):** construimos el mundo. *Mitigación:* **pre-registrar** distribuciones antes de correr; **generador del mundo CIEGO a la política**; incluir los regímenes de §9 y **exigir que el benchmark los reproduzca** (uno que no pueda mostrar a la supervisión fallando está amañado); auditoría por tercero externo al equipo NEXUS.
- **Sesgo de selección:** elegir escenarios favorables. *Mitigación:* muestreo pre-registrado full-factorial/aleatorio sobre los ejes; reportar TODOS los regímenes.
- **Variables escondidas (confounds):** *Mitigación:* diseño pareado (mismo mundo, dos políticas) elimina confounds del mundo.
- **Sobreajuste:** afinar la política al benchmark. *Mitigación:* split train/test del espacio de escenarios; política especificada antes de ver el test; regímenes fuera de distribución.
- **Mundos artificiales (brecha de realismo):** *Mitigación:* NINGUNA total → el benchmark **no confirma** para la realidad; calibrar parámetros del sim contra los datos reales (Gate 0) cuando existan; declararlo explícito.
- **Gaming/Goodhart:** optimizar la métrica, no la meta. *Mitigación:* métrica cabeza = **valor NETO preservado** (incluye costo de acción y de falsos positivos), no tasa de detección; múltiples métricas; penalizar la sobre-supervisión.
- **Controles obligatorios:** **supervisor-oráculo** (cota superior: si ni el oráculo ayuda, la hipótesis muere) · **supervisor-aleatorio/nulo** (cota inferior) · **supervisor-saboteador** (actúa sobre ruido → debe **PERDER** valor; si el benchmark no lo muestra perdiendo, no discrimina) · **compromisos no registrados** (invisibles a la política — prueba la ceguera real).

## 11. Criterios de calidad (¿cuándo está listo para la siguiente fase?)
1. **Discriminación demostrada:** muestra a la supervisión **ganando** en el sweet-spot (R3/C1) Y **fallando/hiriendo** en saturación, ventanas-nulas y con el saboteador. *Si no puede reproducir la falla, no está listo.*
2. **Controles válidos:** oráculo, aleatorio y saboteador se comportan como se predice.
3. **Pre-registro:** distribuciones, regímenes, métricas y umbrales de éxito/muerte registrados **antes** de generar datos.
4. **Separación + frontera de información:** mundo ciego a la política; política solo observables-en-t; **cero leakage por construcción, auditable**.
5. **Sensibilidad mapeada:** dependencia del resultado respecto a los parámetros ocultos clave (fracción C1, slack, concentración de valor, confiabilidad de la acción) caracterizada.
6. **Reproducibilidad por terceros:** un externo lee la spec, regenera los mundos desde los seeds y reproduce los resultados.
7. **Honestidad epistémica explícita:** la spec declara lo que el benchmark NO puede establecer (transferencia a la realidad) y que nunca sustituye el experimento de campo.
> **Meta-criterio:** pasa la revisión de diseño cuando un auditor independiente concluye *"esto está construido para MATAR una hipótesis falsa, no para halagar una verdadera."*
