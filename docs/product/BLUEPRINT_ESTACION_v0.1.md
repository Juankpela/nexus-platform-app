# Blueprint Visual — Estación de Supervisión Operacional (v0.1)

> **Naturaleza.** Traducción **fiel** de la experiencia congelada (`ESTACION_SUPERVISION_v0.1.md`) a un blueprint de interfaz de producción. **No** repiensa el producto, no añade pantallas/módulos/métricas/acciones, no optimiza la experiencia: la **materializa**. Sin código, sin React, sin Tailwind, sin componentes. Cada decisión visual es consecuencia directa de una capa del documento. Sensación rectora: **un puesto de trabajo tranquilo donde alguien supervisa una operación viva 8 horas** — no un dashboard. Fecha: 2026-06-30.

## 1 · Arquitectura visual
**Una sola superficie, sin chrome de navegación** (no hay menús ni módulos a los que ir — navegar lejos de la operación viva es un modo de falla). Una columna de atención vertical que impone el orden de lectura del documento: **Salud (vistazo) → Hero (actuar) → Cola (siguiente) → Evidencia (validar) → Acción**. Tres zonas estructurales:
- **Franja superior (Salud operacional, capa 2):** banda horizontal delgada, de bajo peso visual, que comunica calma/tensión en <2s.
- **Centro dominante (La Decisión de Ahora, capa 1):** el Hero **es** la pantalla. Ocupa el centro óptico con muchísimo espacio alrededor.
- **Riel/columna secundaria (Cola, capa 3):** lista de decisiones pendientes, tranquila, corta.
- **Panel enfocado (Evidencia + Acción, capas 4+5):** aparece al seleccionar un compromiso; toma el foco; se siente como una **explicación**, no un log.
- **Captura efímera (Aprendizaje, capa 6):** casi invisible; aparece en el momento de la acción y al cerrarse el lazo. Nunca un módulo.

## 2 · Wireframe de baja fidelidad (distribución, ver render adjunto)
```
┌──────────────────────────────────────────────────────────────┐
│  SALUD   Protegido hoy $· Expuesto en ventana $· Perdido hoy $ │  ← franja calma (capa 2)
│          Capacidad ▓▓▓░░   ·   Tendencia ↘                     │
├──────────────────────────────────────────┬───────────────────┤
│                                          │ COLA (capa 3)      │
│   LA DECISIÓN DE AHORA   (capa 1)        │ ─ Compromiso  $· ⏱ │
│                                          │ ─ Compromiso  $· ⏱ │
│   «Qué ocurre»            (tipografía    │ ─ Compromiso  $· ⏱ │
│   por qué importa · $valor expuesto       │ ─ Compromiso  $· ⏱ │
│   ⏱ tiempo al PUNTO DE NO RETORNO         │ ▸ 12 más bajo el   │
│                                          │   umbral (colapsado)│
│   [  ACTUAR: reasignar a… ]  (primaria)  │                   │
│   ver evidencia · descartar              │                   │
│                                          │                   │
│            (mucho espacio vacío)         │                   │
└──────────────────────────────────────────┴───────────────────┘
   Al seleccionar un compromiso → panel de EVIDENCIA+ACCIÓN entra desde la derecha:
   Observado · Concluido · Incertidumbre · Acción propuesta(+slack) · Si no se hace nada
   [Reasignar][Expeditar][Renegociar][Escalar][Descartar]
```
**Estado de silencio** (no hay acción importante): el centro reemplaza al Hero por *"Todo lo material está protegido · vigilando 418 compromisos · 0 en riesgo accionable"*, la franja en su tinte calmo, y **el vacío domina** → confianza y silencio.

## 3 · Distribución espacial
- **Márgenes generosos** en todo (el espacio es un requisito, no un lujo).
- **Hero** = centro de masa óptico (~55% del peso visual aunque no de los píxeles). El ojo cae ahí primero.
- **Salud** = banda fina arriba, peso mínimo, glanceable.
- **Cola** = riel derecho (desktop), peso secundario, escaneable, **corta** (solo compromisos en ventana accionable; el resto colapsado).
- **Evidencia/Acción** = panel derecho que toma el foco al seleccionar; la **única** superficie densa, pero maquetada como prosa.
- **Captura** = inferior, efímera, peso ínfimo.

## 4 · Sistema de jerarquía visual
Jerarquía estricta de 4 niveles por **tamaño · peso · espacio · color**:
- **Nivel 0 (dominante):** el núcleo de decisión del Hero — tipografía mayor, más espacio, **el único color de acción saturado de la pantalla**.
- **Nivel 1:** ítems de la Cola + cifras de Salud — medio, calmo, peso uniforme, **numerales tabulares** para valor y tiempo.
- **Nivel 2:** prosa de Evidencia — cuerpo legible, interlineado generoso (sensación de explicación).
- **Nivel 3:** captura de Aprendizaje — el más pequeño, menor contraste, efímero.
**Disciplina de color:** base casi monocroma y calma (neutro + mucho espacio). Color **solo semántico y escaso**: un acento cálido para urgencia/tensión, frío/neutro para protegido/calma; **la acción recomendada es el único elemento primario saturado**. Cero color decorativo. El **tinte global de la franja de Salud** señala calma↔tensión en <2s.
**Tipografía:** grande para decisiones; interlineado amplio para evidencia; tabular para $ y ⏱. Nada de texto denso pequeño salvo la captura efímera.

## 5 · Componentes (1:1 con las capas — ninguno nuevo)
- **HealthStrip** (capa 2): 4 cifras de valor + capacidad + 1 tendencia; tinte = calma/tensión.
- **DecisionHero** (capa 1): qué · por qué · $expuesto · ⏱ al punto de no retorno · 1 línea de evidencia; afordancias: **Actuar** (primaria), *Ver evidencia*, *Descartar*.
- **DecisionList → DecisionLineItem** (capa 3): líneas de decisión (no filas de tabla): compromiso · $ · ⏱ · porqué-en-una-palabra · afordancia de acción; colapsa bajo umbral.
- **EvidencePanel** (capa 4): Observado · Concluido · Incertidumbre · Acción propuesta(+factibilidad) · Si no se hace nada — como explicación, no log.
- **ActionBar** (capa 5): ≤5 acciones contextuales: Reasignar · Expeditar · Renegociar · Escalar · Descartar.
- **CaptureChip** (capa 6): captura efímera de "por qué" + prompt posterior de "¿qué pasó?".
- **SilencePanel** (estado de silencio): reemplaza al Hero con la confirmación de "todo protegido".

## 6 · Estados
- **Activo (hay decisión):** Hero poblado, Cola con ítems.
- **Silencio (todo protegido):** SilencePanel reemplaza al Hero; Cola vacía/colapsada; tinte calmo; **el vacío domina** → confianza.
- **Tensión (saturación):** muchos ítems de alto valor en ventana + capacidad baja → franja en tinte cálido, Cola más larga, un conteo; **comunica "vas atrás" sin ruido de pánico** (misma tipografía calma, solo tinte más cálido).
- **Compromiso seleccionado:** EvidencePanel enfocado (panel derecho), ActionBar visible; el resto se atenúa.
- **Acción en progreso / capturando:** CaptureChip aparece (¿por qué?), luego se retira.
- **Lazo abierto (esperando resultado):** indicador tranquilo de compromiso accionado pendiente de confirmar; luego prompt "¿qué pasó?".
- **Por ítem:** *en-ventana-accionable* (vivo) · *bajo-umbral* (colapsado) · *perdido* (NO aparece aquí — va a un registro tranquilo de "perdidos hoy", jamás como trabajo).
- **Sin operación / fuera de turno:** mínimo y calmo.

## 7 · Responsive
- **Desktop (puesto primario, 8 horas):** Hero centro + Cola riel derecho + Evidencia como panel derecho. Mucho espacio.
- **Tablet:** Hero apila sobre Cola; Evidencia como overlay de ancho completo.
- **Móvil (supervisor fuera del puesto):** **solo el Hero** — "La Decisión de Ahora" como tarjeta a pantalla completa con su acción; Cola por scroll; Evidencia a pantalla completa. En móvil, **el Hero es todo el producto** (coherente con el momento mágico por WhatsApp). La estación degrada con gracia a "la única decisión".
- La jerarquía se preserva en todo tamaño: Hero siempre dominante; Salud siempre un vistazo calmo; **nada se convierte en una tabla densa** en pantallas chicas.

## 8 · Interacciones
- **Abrir** → el ojo cae en el Hero (o en el SilencePanel).
- **Hero:** [Actuar] un clic → ActionBar confirma → CaptureChip (¿por qué?) → el Hero **avanza** a la siguiente decisión. [Ver evidencia] → EvidencePanel. [Descartar] → captura razón → avanza.
- **Cola:** clic en una línea → se vuelve la selección enfocada (Evidencia+Acción). Actuar la remueve; la lista **re-ordena viva**.
- **Evidencia:** leer → [actuar] o [descartar]; la incertidumbre siempre visible.
- **Captura:** chips de un tap, nota opcional; **nunca bloquea**.
- **Re-ordenamiento vivo:** Cola y Hero se actualizan al cambiar el mundo (nuevas derivas, ventanas que cierran) con **transiciones suaves, sin parpadeos ni saltos** — el supervisor nunca se sobresalta.
- **Silencio:** sin acción accionable, la estación se asienta en el SilencePanel, transmitiendo explícitamente *"puedes dejar de escanear"*.
- **Anti-patrones evitados:** sin badges de notificación acumulándose, sin rojo por todas partes, sin modales que interrumpen (salvo el panel de evidencia que el usuario eligió abrir), sin jank de auto-refresh.
