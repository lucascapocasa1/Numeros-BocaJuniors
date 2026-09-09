---
name: election-proposals-commitments
description: Use when loading a political list's ("lista electoral") proposals into the "Elecciones" section of Números Rojos — extracting proposals verbatim from a source (website, PDF, press release) and identifying which parts are "compromisos comprobables" (checkable commitments) to load into the election_commitments table. Triggers on requests like "cargá las propuestas de la lista X", "analizá las propuestas de <URL>", "creá los compromisos para esta lista".
---

# Propuestas y compromisos comprobables de listas electorales

## Cuándo usar esta skill
Cuando haya que cargar en Números Rojos las propuestas de una lista que se postula en la sección "Elecciones" (`election_lists` / `election_proposals` / `election_commitments`), a partir de una fuente externa (sitio web de la lista, PDF, gacetilla, etc.).

## Proceso

### 1. Obtener el contenido fuente completo, verbatim
- Si el sitio tiene tabs/categorías que cambian el contenido por JS o query param (ej. `?area=1..12`), **no asumas que un solo fetch trae todo**. Probá cada variante de URL/tab antes de dar por completo el relevamiento.
- `WebFetch` resume el contenido con un modelo chico — sirve para orientarse, pero **no uses su resumen como fuente final**. Traé el HTML crudo con `curl` (con User-Agent de navegador si hace falta) y limpiá a texto plano vos mismo (sacar `<script>`/`<style>`, poner salto de línea en tags de bloque, hacer unescape de entidades HTML) para poder citar el texto exacto.
- **Si el `curl` del HTML devuelve solo el shell de una SPA** (`<div id="root"></div>` + un bundle JS, típico de Vite/CRA/React), el contenido no está en el HTML. Antes de rendirte: bajá el bundle JS (`<script type="module" src="...">`) y buscá strings del dominio (`grep -i "propuesta"`) — si el bundle usa Firebase/Firestore (`firebase.initializeApp`, `apiKey`/`projectId` visibles en el bundle), la app típicamente lee una colección pública en runtime. Podés leer esa misma colección con la REST API pública de Firestore sin necesidad de headless browser ni credenciales: `curl "https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/{collection}"` — devuelve JSON con `fields` tipados (`stringValue`, `integerValue`, etc.) que hay que aplanar. Esto es leer la misma data pública que el navegador renderiría, no un bypass de nada (las reglas de Firestore ya la exponen en lectura).
- Guardá el texto crudo en el scratchpad antes de transcribir — vas a necesitar volver a citarlo en la auditoría del paso 4.
- **Guardá también la URL exacta de la fuente** (la página específica de propuestas que leíste, no solo el dominio — ej. `https://gentedeindependiente.ar/propuestas`, no `https://gentedeindependiente.ar/`). Es obligatoria: va a `election_lists.source_url` y queda documentada junto a la lista para que cualquiera pueda volver a verificar contra el original. No se considera cargada una lista sin este dato.

### 2. Transcribir las propuestas verbatim
- `title` = encabezado tal cual lo puso la lista.
- `description` = desarrollo completo, verbatim (sin resumir ni corregir redacción salvo tipeos evidentes de la fuente).
- Si la fuente agrupa las propuestas por área/categoría, prefijá el título (`"{Área} · {Título}"`) para no perder esa estructura al aplanarlas en la tabla `election_proposals`.

### 3. Extraer compromisos comprobables (el paso crítico)

Un **compromiso comprobable** es una oración autocontenida que describe UNA acción concreta cuyo cumplimiento se pueda verificar sin lugar a debate — con o sin cifra numérica.

**Regla de oro (aplicar SIEMPRE, es el error más común):** nombrar algo que se va a crear, ampliar, fortalecer o mejorar NO alcanza por sí solo — vale para cualquier verbo, no solo "crear". Hace falta que el texto de la propuesta explique qué hace, qué incluye o qué alcance tiene esa cosa — si la fuente solo le pone un nombre (o un verbo de intención) y no dice nada más, **no es un compromiso, se descarta**.

Ejemplos reales de esta skill (numerosrojos, lista "Gente de Independiente"):
- ❌ "Creación del programa 'Jugadores Embajadores'" — la propuesta lo menciona en una enumeración y no dice qué hace el programa. Se descarta.
- ❌ "Ejecución de obras y mejoras en el Estadio Libertadores de América, los predios de Wilde y Villa Domínico..." — nombra lugares pero no dice qué obras ni en qué plazo. Enumerar ubicaciones no es describir la acción. Se descarta.
- ❌ "Creación del Museo CAI, físico y virtual" — mencionado de pasada junto a otras cosas, sin ningún detalle de qué tendría el museo. Se descarta.
- ✅ "Desarrollo de una plataforma digital exclusiva para peñas (información, trámites, calendarios, actividades y comunicaciones oficiales)" — dice qué hace la plataforma.
- ✅ "Lanzamiento de RojoPay ... con meta de 30% de adopción entre socios activos ... durante el primer año" — tiene alcance + métrica embebida en el texto (este caso puntual es en realidad una **meta**, ver 3a).
- ✅ "Definición y publicación de un organigrama de cabezas de área (coordinadores de Fútbol Juvenil e Infantil, Preparadores Físicos, scouting, metodología...)" — el detalle entre paréntesis es lo que lo hace comprobable.

**Variante frecuente de la regla de oro — enumerar categorías genéricas de actividad tampoco alcanza.** Es la versión "de bajo perfil" del mismo error: en vez de nombrar UNA cosa sin desarrollarla, la propuesta lista *tipos* de actividades o mecanismos sin anclarlos a un programa, cronograma o estructura concreta. La pregunta de corte: **¿puedo señalar una cosa puntual (con nombre propio, estructura definida o alcance medible) que exista o no exista?** Si la respuesta es "no, son solo categorías", se descarta — así el texto tenga varias palabras.
- ❌ "Impulsaremos actividades culturales, educativas y recreativas: talleres, muestras, charlas y espectáculos" — enumera formatos genéricos de actividad, sin programa ni cronograma concreto. Se descarta (corregido 2026-09-03: se había aceptado por error en la primera carga de "Gente de Independiente").
- ❌ "Desarrollaremos herramientas de financiamiento mediante alianzas estratégicas, programas de patrocinio y eventos deportivos" — enumera categorías de mecanismos sin nombrar ninguno en concreto. Se descarta (mismo caso).
- ❌ "Incorporación de nuevas categorías de socios" / "Ampliación de derechos para socios con discapacidad" — declara que algo cambiará (nuevas categorías, más derechos) sin decir cuáles. Se descarta (mismo caso).
- ✅ (contraste) "Organización de eventos y coordinación conjunta entre las peñas para su crecimiento" **no pasa** este filtro (no dice qué eventos ni con qué frecuencia) pero "Creación de una sede virtual como punto de inscripción para las peñas" **sí pasa** (nombra una cosa puntual: una sede virtual con una función específica).

**Tercera variante — el test general de tangibilidad (no es una lista de palabras prohibidas).** Las dos variantes anteriores tienen síntomas reconocibles ("nombra sin desarrollar", "enumera categorías"). Esta es distinta: hay que aplicarla a **cada compromiso, sin excepción**, incluso a los que ya suenan concretos, porque el error no está en palabras específicas ("modelo", "sistema", "planificación") sino en la naturaleza de lo que se afirma. Preguntas de corte, en dos pasos:

1. **Identificá el sustantivo/hecho central** de la oración: lo que se crea, publica, lanza, realiza o alcanza.
2. **Preguntate: si eso existe, ¿dos personas razonables estarían de acuerdo en que existe, sin importar su opinión sobre si "funcionó bien", "se sintió" o "fue de calidad"?**
   - Si sí (es una cosa creada, un documento publicado, un evento que ocurrió, una regla con contenido definido, una cifra alcanzada, un rol/entidad que existe en el organigrama) → **concreto, pasa**.
   - Si la respuesta depende de una valoración subjetiva ("¿se logró la confianza?", "¿se protegió bien la reputación?", "¿el equipo jugó con identidad?", "¿el presupuesto fue realista?", "¿se vinculó bien con la comunidad?") → **abstracto, se descarta esa parte**.

Esto se aplica a la oración completa (si todo el compromiso es abstracto, se descarta la fila entera) y también a **cláusulas sueltas dentro de un compromiso por lo demás válido** — ahí no hace falta tirar todo, se recorta la cláusula abstracta y se conserva el núcleo tangible (esto conecta directo con 3c: acortar no es solo por espacio, es porque la prosa abstracta alrededor de un núcleo concreto no aporta nada verificable).

Categorías de abstracción más comunes (orientativas, no es una lista cerrada — el test de arriba es el que manda):
- **Adjetivos de calidad sin criterio objetivo**: "realista", "ejecutable", "moderno", "profesional", "eficiente", "sólido", "de primer nivel". No aportan nada verificable — se cortan siempre.
- **Objetivos psicológicos, relacionales o de "cultura"**: "acompañar la construcción de confianza", "proteger la reputación institucional", "vincular a las peñas", "fortalecer el sentido de pertenencia". Se cortan salvo que el propio texto diga con qué mecanismo concreto se hace (ahí el compromiso es el mecanismo, no el objetivo).
- **Estilo, filosofía o "modelo" de juego/cultura institucional**: nunca es verificable de forma objetiva, sin excepción (ver ejemplo ADN CAI abajo).
- **Proceso de planificación o gestión interna descripto solo por su forma** (ciclos, bloques, "metodología", "en N aspectos") sin apuntar a un entregable externo — se descarta si no queda nada más; si el texto sí nombra un entregable puntual (documento, órgano, evento, herramienta), el compromiso es ese entregable, no el proceso.

Ejemplos reales de esta skill (corregidos en sucesivas rondas — algunos ya habían pasado el filtro de las variantes 1 y 2 y cayeron recién acá):
- ❌ "Implementación del juego de posición ... según el Manual ADN CAI ... sobre una base táctica 4-3-3" — modelo de juego, no verificable aunque cite un manual. Se descarta la fila completa.
- ❌ "Implementación de una planificación anual en ciclos semestrales y bloques bimestrales..." — describe la forma de un proceso interno sin decir qué produce. Se descarta la fila completa.
- ❌ "Elaboración de un presupuesto anual **realista, ejecutable y alineado a la verdadera capacidad económica**" — sacados los adjetivos de calidad no queda nada que no sea trivial (todo club hace un presupuesto). Se descarta la fila completa.
- ❌ (recorte de cláusula, no de la fila) "Incorporación de un área de psicología deportiva **que acompañe la construcción de confianza, el manejo de la frustración y las transiciones difíciles**" → queda "Incorporación de un área de psicología deportiva en las divisiones formativas." — se corta el objetivo psicológico (no verificable), se conserva el núcleo (el área/rol existe o no existe).
- ❌ (recorte de cláusula) "Creación de una Unidad de Brand Management dedicada a monitorear noticias y redes, **y proteger la reputación institucional**" → se corta "y proteger la reputación institucional" (abstracto), se conserva "monitorear noticias y redes" (actividad concreta de la unidad).
- ✅ (contraste) "Publicación de un organigrama de cabezas de área: coordinadores de..." — es el entregable, no el proceso de organizarse.
- ✅ (contraste) "Incorporación de un área de nutrición con diagnósticos individuales, planes alimentarios por categoría y educación a las familias" — pasa porque cada ítem es un entregable concreto (un diagnóstico, un plan, una sesión), no una cualidad ("mejorar la alimentación").

**Otras reglas:**
- El texto del compromiso debe incluir en sí mismo la forma de evaluarlo. Sumá al compromiso el detalle concreto que la propuesta sí da (cifras, plazos, alcance, composición), no te quedes solo con el nombre de la cosa si la fuente da más.
- Nunca inventes contenido que la fuente no tiene. Es preferible que una propuesta quede con 0 compromisos a que se le atribuya uno que no está sustentado en el texto.

### 3a. Clasificar: `compromiso` vs `meta`

Cada fila de `election_commitments` tiene un campo `kind` (`compromiso` | `meta`). La distinción **no es sobre qué tan importante es la acción, sino sobre si trae una métrica cuantificable explícita** en el texto de la fuente:

- **`meta`**: el texto incluye una cifra, porcentaje, cantidad o umbral objetivo a alcanzar (con o sin plazo asociado). Ej.: "30% de adopción entre socios activos durante el primer año", "reducir en un 15% los costos operativos", "alcanzar 10.000 socios activos para 2027".
  - Campos: `description` (el compromiso completo, igual que antes) + opcionalmente `metric_value` (número), `metric_unit` (qué mide: "% de adopción", "socios activos") y `deadline` (texto libre: "primer año", "2027"). Si la métrica no se puede aislar limpiamente en un número (ej. "más del 50%"), dejá `metric_value`/`metric_unit` nulos y confiá en que el texto de `description` ya la expresa — no fuerces el parseo.
- **`compromiso`**: describe una acción concreta y verificable pero sin cifra objetivo — se cumple o no se cumple, no hay un umbral numérico que evaluar. Ej.: "creación de la Secretaría Técnica", "desarrollo de una plataforma digital para peñas".

**Regla de decisión rápida:** si al leer el compromiso aislado te preguntás "¿cuánto?" y el texto ya responde con un número/porcentaje/cantidad → `meta`. Si la pregunta relevante es solo "¿se hizo o no?" → `compromiso`.

### 3b. Separar compromisos agrupados (uno por acción atómica)

**Default: separar, no agrupar.** Cada compromiso debe describir UNA sola acción evaluable de forma independiente. Si una propuesta trae varias acciones concretas con desarrollo propio en el texto, cada una es un compromiso (o meta) separado — aunque estén en la misma oración o párrafo.

- ✅ Separar: "Desarrollaremos una plataforma digital de pases (X) y un fondo de becas para juveniles (Y)" con desarrollo propio para X e Y → dos compromisos.
- ✅ Separar: una propuesta que junta una acción sin métrica ("crear la Secretaría Técnica") con una acción que sí trae cifra ("alcanzar 10.000 socios en 2 años") → van separados también porque tienen `kind` distinto.
- **Única excepción para agrupar:** cuando dos o más menciones son en realidad la misma creación institucional vista desde ángulos distintos, sin que ninguna agregue una acción nueva (ej. "crear la Secretaría Técnica" + "designar un Director Deportivo que la lidera", cuando el Director es la cabeza de esa misma Secretaría y no se le describe una función adicional). Ahí sí se fusionan en un solo compromiso.
- Si un compromiso te queda muy largo (más de 2-3 cláusulas con "y"), es una señal de que probablemente deberías haberlo separado — revisalo contra la regla de arriba antes de darlo por bueno.

### 3c. Redactar corto (una oración, sin literatura)

Los compromisos se leen en una lista, no como párrafo de propuesta — tienen que poder escanearse en segundos. **Objetivo: una sola oración, apuntando a ~25-30 palabras.** No es un límite duro, pero si te vas muy por encima, recortá.

- Estructura: **[verbo de acción] + [qué cosa concreta] + [el dato puntual que lo hace comprobable]**. Todo lo demás — motivación, contexto, listas exhaustivas de sub-tareas menores, adjetivos de relleno — se corta.
- **No sacrifiques el dato que hace comprobable al compromiso solo por acortar.** Si el detalle entre paréntesis o la cifra es lo que lo vuelve verificable (regla de oro / 3a), ese dato se queda sí o sí; lo que se recorta es la prosa alrededor, no la sustancia.
- Ejemplo real (antes de esta regla, 43 palabras): *"Creación de la Secretaría Técnica, liderada por un Director Deportivo a cargo de la gestión diaria del club, con un Staff responsable del mercado de pases, la organización interna de áreas y departamentos, el scouting, la interacción con agentes y los acuerdos comerciales."*
  → Después (16 palabras): *"Creación de la Secretaría Técnica, liderada por un Director Deportivo, a cargo de la gestión diaria del fútbol profesional."* — se pierde el listado exhaustivo de funciones del Staff (ruido), se mantiene qué es y quién la lidera (lo esencial y comprobable).
- Si te cuesta acortar sin perder el dato clave, es señal de que en realidad son 2+ compromisos mezclados (volvé a 3b) — no de que haya que forzar una oración larga.

### 4. Auditoría obligatoria de segunda pasada
Después de la primera extracción, releé cada compromiso propuesto y preguntate:

> **"¿Alguien que lea SOLO esta oración, sin el resto de la propuesta, podría decir con certeza si se cumplió o no?"**

Si la respuesta depende de información que la propuesta no da (qué obra puntual, qué hace el programa, en qué plazo), el compromiso se descarta o se reformula solo con lo que la fuente sí sostiene. Esta auditoría no es opcional — la primera pasada de extracción tiende a ser demasiado permisiva (confundir "le pusieron un nombre" con "es medible").

Además, en esta segunda pasada verificá específicamente:
- **¿Este compromiso tiene una cifra objetivo?** Si sí y quedó como `kind=compromiso`, recalificalo como `meta` (y viceversa: si es `meta` pero en realidad no hay número/umbral, bajalo a `compromiso`).
- **¿Este compromiso junta más de una acción?** Contá las acciones verbales independientes ("crear X", "lanzar Y", "alcanzar Z"). Si hay 2+ con desarrollo propio en el texto, separalo en filas distintas siguiendo 3b.
- **¿Es una categoría genérica de actividad en vez de una cosa puntual?** Aplicá el filtro de la "variante frecuente" del paso 3 — si no podés señalar un nombre propio, estructura o alcance concreto, se descarta aunque tenga varias palabras.
- **¿Cada cláusula del compromiso es tangible?** Aplicá el test de la "tercera variante" del paso 3 frase por frase, no solo al compromiso como un todo — es común que el núcleo sea concreto pero le cuelgue una cláusula abstracta (un objetivo psicológico, un adjetivo de calidad, un "modelo" o "proceso interno"). Cortá esa cláusula y quedate con el núcleo tangible; si no queda ningún núcleo tangible, se descarta la fila entera.
- **¿Quedó demasiado largo?** Aplicá 3c y recortalo antes de darlo por definitivo.

### 5. Justificar las propuestas sin compromisos

Toda propuesta que termine con 0 filas en `election_commitments` (ni compromiso ni meta) tiene que dejar registrado **por qué** no se pudo extraer nada, en `election_proposals.no_commitments_reason` — no se deja el campo vacío en silencio. Una frase corta alcanza; usá el motivo real, no una fórmula genérica copada de otra propuesta:
- "Declara una intención general sin describir acciones, obras o mecanismos concretos."
- "Menciona una creación puntual (nombre) pero no explica qué hace ni qué incluye."
- "Enumera categorías de actividades o mecanismos sin nombrar un programa, cronograma o estructura concreta."
- "Describe la función genérica de un área/rol del club, no una acción con estado de cumplimiento verificable."
- "Es un modelo/estilo de juego o un proceso de gestión interna sin entregable externo identificable — no tiene un criterio objetivo de cumplimiento."

## Modelo de datos (numeros-rojos)
- `election_lists`: id, token, name, `source_url` (string, obligatorio — URL de la fuente leída), logo_path/logo_original_name.
- `election_proposals`: id, election_list_id (FK), title, description, order, `no_commitments_reason` (text nullable — obligatorio completar cuando la propuesta queda con 0 compromisos/metas, ver paso 5). **Sin `unit`/`unit_value`** — esos campos se removieron; toda la "forma de evaluar" vive dentro de `election_commitments`.
- `election_commitments`: id, election_proposal_id (FK, cascadeOnDelete), `kind` (ENUM `compromiso`|`meta`, default `compromiso`), description (texto libre autocontenido, corto — ver 3c), `metric_value` (decimal nullable, solo si `kind=meta` y la cifra se puede aislar), `metric_unit` (string nullable), `deadline` (string libre nullable), order. Ver 3a para el criterio de clasificación.

## Carga a la base
1. La lista (`election_lists`) se crea desde `/admin/elecciones` (nombre + logo + **Fuente (URL)**, este último obligatorio) — no hace falta SQL para esto.
2. Generar el INSERT de `election_proposals` en Python (no a mano): un dict/list con `(area, title, description, order, no_commitments_reason)`, escapando `'` → `''` y `\` → `\\` al armar el SQL. `no_commitments_reason` va `NULL` si la propuesta tiene compromisos/metas, o el texto de la justificación si no tiene ninguno (ver paso 5).
3. Generar el INSERT de `election_commitments` referenciando el proposal vía subquery `(SELECT id FROM election_proposals WHERE election_list_id = X AND title = '...' LIMIT 1)` — evita tener que hardcodear IDs y es robusto a reinserciones.
4. **Ejecutar el `.sql` con `mysql --default-character-set=utf8mb4 ...`**. Sin este flag los acentos se corrompen (mojibake) — ya pasó una vez en esta base.
5. Verificar: contar filas, chequear que no haya `election_proposal_id IS NULL` (indicaría un título que no matcheó por typo) ni propuestas con 0 compromisos y `no_commitments_reason IS NULL`, y pegarle a `GET /api/v1/elections` para confirmar que el JSON público se ve bien (acentos incluidos).
6. Si hay que corregir/reemplazar compromisos ya cargados para una lista, lo más simple es `DELETE FROM election_commitments WHERE election_proposal_id IN (SELECT id FROM election_proposals WHERE election_list_id = X)` y volver a insertar todo el set revisado — más simple y menos propenso a errores que actualizar fila por fila.

## Historial de aprendizajes
- **2026-08-25 (carga inicial):** primera carga de "Gente de Independiente" (79 propuestas, 12 áreas, sitio con tabs por `?area=1..12`). Primer criterio de "medible" fue solo numérico (2 de 79) → se amplió a "creación de algo concreto" (65 compromisos en 55 propuestas) → **se detectó que ese criterio era demasiado permisivo**: aceptaba compromisos que solo nombraban algo sin explicar qué hacía ("Creación del programa Jugadores Embajadores", "Ejecución de obras... en el Estadio, Wilde, Villa Domínico..."). Se agregó la "regla de oro" del paso 3 y la auditoría del paso 4, y se recargaron los compromisos de esa lista con el criterio corregido.
- **2026-09-03 (compromiso vs. meta + separación atómica):** se detectó que algunos compromisos con cifra numérica (ej. "30% de adopción durante el primer año") quedaban mezclados con compromisos sin métrica, y que varios compromisos agrupaban 2+ acciones independientes en una sola fila (quedaban demasiado largos). Se agregó el campo `kind` (`compromiso`|`meta`) más `metric_value`/`metric_unit`/`deadline` al schema, el criterio de clasificación (paso 3a) y la regla de separación atómica por default (paso 3b, con la única excepción de fusión ya documentada). La auditoría del paso 4 ahora incluye chequear reclasificación de `kind` y detección de compromisos que deberían partirse.
  - Con el criterio nuevo se re-auditó "Gente de Independiente" (79 propuestas, ya cargadas): pasó de 59 compromisos (criterio viejo) a **92 filas (89 compromisos + 3 metas)** — la propuesta de RojoPay (billetera digital, 30% de adopción / 50% de transacciones / 15% de reducción de morosidad, todas "durante el primer año") es el caso de referencia de `kind=meta` con `metric_value`/`metric_unit`/`deadline` bien aislados.
  - Se cargó "Lista Roja" (agrupacionlistaroja.com.ar) desde cero: **12 propuestas, 11 compromisos, 0 metas** — sus propuestas son notablemente más cortas y menos específicas que las de "Gente de Independiente" (varias son declaraciones de intención sin desarrollo concreto: "Nuevo Modelo de Gestión", "Estructura del Fútbol Profesional", "Proyecto de Fútbol Infanto-Juvenil", el plan de infraestructura de Propuesta 10 — los 4 quedaron en 0 compromisos por la regla de oro, ninguna trae cifras). El sitio es una SPA de React que trae las propuestas desde Firestore en runtime — el HTML crudo solo tenía el shell (`<div id="root">`); hubo que bajar el bundle JS y usar la REST API pública de Firestore para leer la colección `proposals` (ver paso 1).
- **2026-09-03 (redacción corta + fuente + justificación + regla de oro más estricta):** feedback directo del usuario sobre la primera carga con `kind`: los compromisos quedaban muy largos ("mucha literatura"), no se guardaba de dónde había salido cada lista, las propuestas sin compromisos no explicaban por qué, y algunos compromisos aceptados seguían sin ser específicos. Cambios:
  - `election_lists.source_url` (obligatorio) y `election_proposals.no_commitments_reason` (obligatorio si 0 compromisos/metas) — nuevos campos, ver "Modelo de datos" y pasos 1/5.
  - Regla 3c (redactar corto, ~25-30 palabras, sin sacrificar el dato que hace comprobable al compromiso).
  - Regla de oro ampliada: enumerar *categorías genéricas* de actividad/mecanismo (sin nombre propio ni alcance concreto) tampoco alcanza — antes solo se descartaba "nombrar algo sin desarrollarlo", ahora también "listar tipos de cosas sin anclarlas a algo puntual".
  - Se re-auditaron ambas listas con este criterio más estricto: se retiraron compromisos que habían pasado el filtro viejo pero no el nuevo (ej. "talleres, muestras, charlas y espectáculos" en Cultura, "alianzas estratégicas, patrocinio y eventos deportivos" en Deporte Amateur, "nuevas categorías de socios"/"derechos para discapacidad" sin especificar en Estatuto, "organización de eventos entre peñas" sin detalle), se acortó la redacción de todos los compromisos sobrevivientes, y se completó `no_commitments_reason` en cada propuesta que quedó en 0.
- **2026-09-04 (tercera variante — estilo de juego y procesos internos sin entregable):** el usuario señaló, con dos ejemplos puntuales de "Gente de Independiente", que la vara todavía no era suficiente: "Implementación del juego de posición... según el Manual ADN CAI" pasó el filtro pese a ser un modelo/estilo de juego sin forma de validación empírica, e "Implementación de una planificación anual en ciclos semestrales y bloques bimestrales..." pasó pese a describir solo la *forma* de un proceso de planificación interno, sin decir qué produce. Se agregó la "tercera variante" al paso 3 (con la pregunta de corte: tachar "modelo/sistema/proceso/planificación/metodología/plan" y ver si queda un sustantivo concreto y externo) y el chequeo correspondiente al paso 4.
  - Re-auditoría de "Gente de Independiente" con este filtro: se descartaron el compromiso de ADN CAI/juego de posición, el de planificación metodológica, un compromiso de "sistema permanente de control de gestión" (Economía · Presupuesto real), la etapa de "renovación informática" dentro de Transformación Digital (quedaron las otras 3 etapas: Boti, app, red social — esas sí nombran entregables concretos), y el de "propuesta educativa" para jóvenes/adultos sin secundario completo (no decía en qué consistía la propuesta). Pasó de 82 a **77 filas (74 compromisos + 3 metas)**, con 3 propuestas más en 0 (ahora 27 en total, todas con `no_commitments_reason`).
  - "Lista Roja" no tuvo cambios — sus 11 compromisos ya apuntaban a entregables concretos (Rojo Play, Semana/Moneda Roja, Reglamento de Contrataciones, becas educativas, etc.), ninguno caía en las dos variantes nuevas.
- **2026-09-04 (generalización — test de tangibilidad, no lista de palabras):** el usuario corrigió el enfoque anterior: no hay que memorizar que "modelo de juego" o "sistema de gestión" están mal — hay que aplicar el principio de fondo ("¿es tangible o es abstracto?") a **todos** los compromisos, incluidos los que ya habían pasado el filtro. Se reescribió la tercera variante como un test general de dos pasos (identificar el sustantivo central, preguntar si su existencia es objetivamente verificable más allá de una valoración de calidad/sensación) aplicable también a **cláusulas sueltas** dentro de compromisos por lo demás válidos (se recorta la cláusula abstracta, no se tira todo el compromiso si tiene un núcleo tangible).
  - Re-auditoría completa de "Gente de Independiente" con este test aplicado a las 74 filas existentes (no solo a las nuevas): se descartó la fila completa de "Presupuesto real" (los adjetivos "realista, ejecutable, alineado a la capacidad económica" no dejaban nada verificable) y la de "mecanismos de consulta a los socios en asambleas" (no decía cuál mecanismo). Se recortaron cláusulas abstractas manteniendo el núcleo tangible en: psicología deportiva (se sacó "que acompañe la construcción de confianza..."), scouting federal (se sacó "que evalúe... en 4 aspectos"), charlas tácticas (se sacó "generación de contenido de jugadores"), Embajadores (se sacaron los verbos relacionales vagos, quedaron los acuerdos concretos), Unidad de Brand Management (se sacó "proteger la reputación institucional"), Departamento de Mujeres (se llevó al frente el hecho concreto — voz en la Comisión Directiva — en vez de "empoderamiento"), coordinadores por disciplina (se sacó "planificar el crecimiento y optimizar recursos"), modelo de gestión de infraestructura e infraestructura ADN CAI (se sacó la palabra "modelo", quedaron los mecanismos/obras concretas). Pasó de 77 a **75 filas (72 compromisos + 3 metas)**, 28 propuestas en 0 (todas con `no_commitments_reason`).
  - "Lista Roja" se revisó con el mismo test y no tuvo cambios — sus 11 compromisos ya tenían anclas tangibles (eventos y sistemas nombrados, documentos, acuerdos) sin depender de valoraciones subjetivas.
