// Transcripción fiel (recortada de pasos puramente operativos de scraping/carga a
// la base) de las instrucciones que sigue el modelo de IA para extraer y clasificar
// compromisos y metas a partir del texto de propuestas de cada lista. Fuente:
// .claude/skills/election-proposals-commitments/SKILL.md del repositorio del proyecto.
export const PROMPT_STEPS = [
  {
    title: '1. Obtener el contenido fuente completo, verbatim',
    blocks: [
      { type: 'p', text: 'Se trae el texto crudo de la fuente (sitio web, PDF, gacetilla) sin resumir. Si un resumen automático simplifica el contenido, no se usa como fuente final — se cita el texto exacto de la página original.' },
      { type: 'p', text: 'Se guarda la URL exacta de la fuente leída (no solo el dominio). Es obligatoria: una lista no se considera cargada sin este dato, y queda publicada junto a la lista para que cualquiera pueda verificar contra el original.' },
    ],
  },
  {
    title: '2. Transcribir las propuestas verbatim',
    blocks: [
      { type: 'p', text: '`title` = encabezado tal cual lo puso la lista. `description` = desarrollo completo, verbatim (sin resumir ni corregir redacción salvo tipeos evidentes de la fuente).' },
    ],
  },
  {
    title: '3. Extraer compromisos comprobables (el paso crítico)',
    blocks: [
      { type: 'p', text: 'Un **compromiso comprobable** es una oración autocontenida que describe UNA acción concreta cuyo cumplimiento se pueda verificar sin lugar a debate — con o sin cifra numérica.' },
      { type: 'p', text: '**Regla de oro (aplicar SIEMPRE, es el error más común):** nombrar algo que se va a crear, ampliar, fortalecer o mejorar NO alcanza por sí solo — vale para cualquier verbo, no solo "crear". Hace falta que el texto de la propuesta explique qué hace, qué incluye o qué alcance tiene esa cosa — si la fuente solo le pone un nombre (o un verbo de intención) y no dice nada más, no es un compromiso, se descarta.' },
      { type: 'p', text: '**Variante frecuente:** enumerar categorías genéricas de actividad tampoco alcanza. La pregunta de corte: ¿puedo señalar una cosa puntual (con nombre propio, estructura definida o alcance medible) que exista o no exista? Si la respuesta es "no, son solo categorías", se descarta.' },
      { type: 'p', text: '**Tercera variante — test general de tangibilidad (no es una lista de palabras prohibidas):** se aplica a cada compromiso, sin excepción, en dos pasos: (1) identificar el sustantivo/hecho central de la oración — lo que se crea, publica, lanza, realiza o alcanza; (2) preguntarse si, dado que eso existe, dos personas razonables estarían de acuerdo en que existe, sin importar su opinión sobre si "funcionó bien", "se sintió" o "fue de calidad". Si depende de una valoración subjetiva, es abstracto y se descarta esa parte — la oración completa si todo es abstracto, o solo la cláusula abstracta si el resto del compromiso tiene un núcleo tangible.' },
      { type: 'p', text: 'Otras reglas: el compromiso debe incluir en sí mismo la forma de evaluarlo (cifras, plazos, alcance, composición que la fuente sí da). Nunca se inventa contenido que la fuente no tiene — es preferible dejar una propuesta con 0 compromisos a atribuirle uno no sustentado en el texto.' },
    ],
  },
  {
    title: '3a. Clasificar: compromiso vs. meta',
    blocks: [
      { type: 'p', text: 'La distinción no es sobre qué tan importante es la acción, sino sobre si trae una **métrica cuantificable explícita** en el texto de la fuente. **Meta**: incluye una cifra, porcentaje, cantidad o umbral objetivo a alcanzar. **Compromiso**: acción concreta y verificable pero sin cifra objetivo — se cumple o no se cumple.' },
      { type: 'p', text: 'Regla rápida: si al leer el compromiso aislado la pregunta relevante es "¿cuánto?" y el texto ya responde con un número → meta. Si la pregunta es solo "¿se hizo o no?" → compromiso.' },
    ],
  },
  {
    title: '3b. Separar compromisos agrupados',
    blocks: [
      { type: 'p', text: 'Default: separar, no agrupar. Cada compromiso describe UNA sola acción evaluable de forma independiente, aunque varias acciones estén en la misma oración o párrafo de la fuente. Única excepción: cuando dos menciones son la misma creación institucional vista desde ángulos distintos, sin que ninguna agregue una acción nueva.' },
    ],
  },
  {
    title: '3c. Redactar corto',
    blocks: [
      { type: 'p', text: 'Objetivo: una sola oración, apuntando a ~25-30 palabras. Estructura: [verbo de acción] + [qué cosa concreta] + [el dato puntual que lo hace comprobable]. Se corta la motivación, el contexto y los adjetivos de relleno — nunca el dato que hace comprobable al compromiso.' },
    ],
  },
  {
    title: '4. Auditoría obligatoria de segunda pasada',
    blocks: [
      { type: 'p', text: 'Después de la primera extracción, se relee cada compromiso propuesto con la pregunta: "¿Alguien que lea SOLO esta oración, sin el resto de la propuesta, podría decir con certeza si se cumplió o no?". Si la respuesta depende de información que la propuesta no da, el compromiso se descarta o se reformula solo con lo que la fuente sostiene.' },
      { type: 'p', text: 'Esta segunda pasada verifica además: reclasificación compromiso/meta si corresponde, si el compromiso junta más de una acción (separar), si es una categoría genérica en vez de algo puntual, si cada cláusula pasa el test de tangibilidad (frase por frase, no solo el compromiso entero), y si quedó demasiado largo.' },
    ],
  },
];
