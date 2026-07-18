// The 3 starting recipes for the /quiz-cabello funnel.
//
// Same ids (and same order) as ESSENTIAL_IDS in
// src/components/hair/EssentialRecipesCard.jsx — the app's home essentials,
// minus the optional "progresiva casera" (maizena-acucar), which this funnel
// sells separately as bonus 3.
//
// Fixed, not scored against the answers: everyone who finishes the quiz gets
// these three. /quiz's results page is the one that picks from the 26-recipe
// library — do not confuse the two.
//
// The results page shows these with the giveaway ingredient blurred; the offer
// page shows the real names in full. Both read the ids from here so they can't
// drift apart.
export const ESSENTIAL_RECIPE_IDS = ['babosa-mel', 'tratamento-noturno-oleo', 'mel-de-babosa']

/**
 * Turn real text into an X/x placeholder of the same length (letters/digits →
 * X for uppercase, x for the rest; spaces and punctuation kept). Used for every
 * blurred teaser so the real words never reach the DOM — a CSS blur alone can be
 * removed with the inspector, this can't. Render `maskText(realValue)`, never the
 * real value, inside a blurred element.
 * @param {string} input
 * @returns {string}
 */
export function maskText(input) {
  return String(input ?? '').replace(/[\p{L}\p{N}]/gu, ch =>
    ch !== ch.toLocaleLowerCase() && ch === ch.toLocaleUpperCase() ? 'X' : 'x')
}

/** Bonus 3 — sold as the "receta adicional de alineación casera". */
export const ALIGNMENT_RECIPE_ID = 'maizena-acucar'

// The 3 starting recipes as shown (locked) on the results page AND the offer's
// "El comienzo ideal" section. The name is split into parts: `{ t }` renders as
// plain text (the connectors), `{ b }` renders blurred. Every `b` value is
// already an X-mask (never the real ingredient) so it can't be un-blurred from
// the DOM. Every card carries the same "SELECCIONADA PARA TI" tag.
//   babosa-mel:              Mascarilla de [Aloe Vera] y [Miel]
//   tratamento-noturno-oleo: [Aceite de Coco] + [Ricino]
//   mel-de-babosa:           [Miel] de [Aloe Vera]
export const RECIPE_TAG = 'SELECCIONADA PARA TI'
export const ESSENTIAL_CARDS = [
  {
    id: 'babosa-mel',
    emoji: '🌿',
    nameParts: [{ t: 'Mascarilla de' }, { b: 'Xxxx Xxxx' }, { t: 'y' }, { b: 'Xxxx' }],
    desc: 'Hidratación intensa que ayuda a devolver suavidad y brillo, controlar el frizz y sellar las cutículas. Ideal para empezar: desde las primeras aplicaciones el cabello se ve más alineado y se siente mucho más manejable.',
  },
  {
    id: 'tratamento-noturno-oleo',
    emoji: '🌙',
    nameParts: [{ b: 'Xxxxxx xx Xxxx' }, { t: '+' }, { b: 'Xxxxxx' }],
    desc: 'Tratamiento nocturno de nutrición profunda: mientras duermes, los aceites actúan sobre las hebras para aportar suavidad, reducir la sensación de resequedad en las puntas y dejar el cabello más fácil de peinar y con mejor apariencia al día siguiente.',
  },
  {
    id: 'mel-de-babosa',
    emoji: '🍯',
    nameParts: [{ b: 'Xxxx' }, { t: 'de' }, { b: 'Xxxx Xxxx' }],
    desc: 'Tónico natural para el cuidado del día a día, pensado para refrescar el cuero cabelludo y acompañar tu rutina de forma constante. Con el uso continuo ayuda a que el cabello se vea y se sienta más cuidado, fuerte y con vida.',
  },
]

/**
 * Role + display name for each recipe, keyed by id.
 *
 * `nameVisible` / `nameHidden` split the title so the results page can blur the
 * giveaway ingredient; the offer page shows `nameVisible + nameHidden` as the
 * payoff of that blur. Both pages read from here so the person recognises the
 * exact same recipe on both screens.
 *
 * Note these are NOT always the library's `name`: the library calls
 * tratamento-noturno-oleo "Tratamiento Nocturno de Aceite", but the funnel uses
 * the app's own short name ("Aceite de Coco + Ricino") so the blurred title on
 * the results page and the revealed title on the offer match word for word.
 */
export const RECIPE_ROLES = {
  'babosa-mel': {
    emoji: '🌿',
    tag: 'RECETA PRINCIPAL',
    nameVisible: 'Mascarilla de Aloe Vera y',
    nameHidden: 'Miel',
    text: 'Una opción sencilla para comenzar con tu principal objetivo.',
    items: ['Ingredientes completos', 'Cantidades exactas', 'Preparación paso a paso', 'Frecuencia sugerida'],
  },
  'tratamento-noturno-oleo': {
    emoji: '🌙',
    tag: 'RECETA COMPLEMENTARIA',
    nameVisible: 'Aceite de Coco +',
    nameHidden: 'Ricino',
    text: 'Una segunda opción para complementar los cuidados durante la semana.',
    items: ['Forma de preparación', 'Tiempo aproximado', 'Instrucciones de aplicación', 'Cómo combinarla con la receta principal'],
  },
  'mel-de-babosa': {
    emoji: '🍯',
    tag: 'RECETA DE MANTENIMIENTO',
    nameVisible: 'Miel de Aloe Vera',
    nameHidden: null,
    text: 'Una opción para ayudarte a mantener una rutina más constante.',
    items: ['Ingredientes', 'Preparación', 'Forma de aplicación', 'Momento recomendado dentro de la rutina'],
  },
}

/** Full revealed name — what the offer page shows. */
export const fullRecipeName = (id) => {
  const r = RECIPE_ROLES[id]
  if (!r) return ''
  return r.nameHidden ? `${r.nameVisible} ${r.nameHidden}` : r.nameVisible
}

/** Social proof, shared across the funnel so the numbers can never disagree. */
export const SOCIAL_PROOF = {
  women: '53.250',
  whatsapp: '22.000',
}

const IMG = '/images/quiz-natglow'

// Testimonials for the /quiz-cabello funnel.
//
// The photo + text are fixed (each text describes what its own before/after pair
// actually shows). Only the NAME and LOCATION change per country, so the social
// proof feels local: a Mexican visitor sees Mexican names and cities, a Colombian
// sees Colombian ones, etc. USD (default) keeps the original mixed-LatAm set.
//
// Only the first entry carries a profile photo (Camila); the rest fall back to
// the carousel's initial-in-a-circle. Text stays on appearance ("se ve más…")
// and never promises a result.
const TESTIMONIAL_BASE = [
  {
    duration: 'Algunas semanas',
    // a-1 → b-1: frizzy, undefined waves → smoother, waves falling evenly.
    text: 'Mi cabello se abría solo, con pelitos parados por todos lados y las ondas sin forma. Después de algunas semanas siguiendo la rutina, se ve más alineado y las ondas caen más parejas.',
    avatar: `${IMG}/testimonial-camila.webp`,
    antes: `${IMG}/foto-a-1.webp`,
    depois: `${IMG}/foto-b-1.webp`,
  },
  {
    duration: 'Algunas semanas',
    // a-2 → b-2: frizz with no curl pattern → defined, separated ringlets.
    text: 'Tenía el rizo deshecho, más frizz que forma. Con la rutina los rizos volvieron a marcarse uno por uno. No esperaba que la diferencia se notara tanto.',
    antes: `${IMG}/foto-a-2.webp`,
    depois: `${IMG}/foto-b-2.webp`,
  },
  {
    duration: 'Algunas semanas',
    // a-3 → b-3: wide, sparse-looking part → part looks fuller (appearance only).
    text: 'Lo que más me molestaba era la raya del medio, se me veía muy despoblada. Ahora la raíz se ve más llena y la raya menos marcada.',
    antes: `${IMG}/foto-a-3.webp`,
    depois: `${IMG}/foto-b-3.webp`,
  },
  {
    duration: 'Algunas semanas',
    // a-4 → b-4: heavy frizz → sleek and shiny.
    text: 'Vivía peleando con el frizz, no había día que pudiera dejarlo suelto. Ahora se acomoda liso y con brillo sin tanto esfuerzo.',
    antes: `${IMG}/foto-a-4.webp`,
    depois: `${IMG}/foto-b-4.webp`,
  },
  {
    duration: 'Algunas semanas',
    text: 'Probé de todo. Solo esta rutina natural me trajo el resultado que esperaba. Mi cabello tiene una apariencia más uniforme y con rizos más definidos.',
    antes: `${IMG}/foto-a-6.webp`,
    depois: `${IMG}/foto-b-6.webp`,
  },
]

// [name, location] per country, one per TESTIMONIAL_BASE entry.
const TESTIMONIAL_IDENTITY = {
  default: [
    ['Camila Vargas', 'Ciudad de México, MX'],
    ['Carolina Mendoza', 'Bogotá, Colombia'],
    ['Constanza Muñoz', 'Santiago, Chile'],
    ['Sofía Fernández', 'Buenos Aires, Argentina'],
    ['Valentina Cedeño', 'Guayaquil, Ecuador'],
  ],
  mx: [
    ['Camila Vargas', 'Ciudad de México'],
    ['Ana Sofía Reyes', 'Guadalajara'],
    ['Mariana Torres', 'Monterrey'],
    ['Valeria Domínguez', 'Puebla'],
    ['Fernanda Ruiz', 'Mérida'],
  ],
  co: [
    ['Valentina Ríos', 'Bogotá'],
    ['Daniela Restrepo', 'Medellín'],
    ['Camila Ospina', 'Cali'],
    ['Manuela Gómez', 'Barranquilla'],
    ['Laura Vargas', 'Cartagena'],
  ],
  pe: [
    ['Camila Flores', 'Lima'],
    ['Fernanda Quispe', 'Arequipa'],
    ['Valeria Chávez', 'Trujillo'],
    ['Andrea Rojas', 'Cusco'],
    ['Micaela Díaz', 'Piura'],
  ],
  cl: [
    ['Constanza Muñoz', 'Santiago'],
    ['Javiera Fuentes', 'Valparaíso'],
    ['Antonia Rojas', 'Concepción'],
    ['Camila Soto', 'Viña del Mar'],
    ['Fernanda Morales', 'La Serena'],
  ],
}

/**
 * Testimonials for a resolved country code (mx|co|pe|cl|default): the fixed
 * photos/text with country-appropriate names and locations.
 * @param {string} code
 */
export function getCabelloTestimonials(code) {
  const ids = TESTIMONIAL_IDENTITY[code] ?? TESTIMONIAL_IDENTITY.default
  return TESTIMONIAL_BASE.map((b, i) => ({ ...b, name: ids[i][0], location: ids[i][1] }))
}

/** The single testimonial the quiz shows (step 21), for the resolved country. */
export const getQuizTestimonial = (code) => getCabelloTestimonials(code)[0]
