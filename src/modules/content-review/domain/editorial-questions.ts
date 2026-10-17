// Relative imports (not "@/") so `node --test` can load this file without a bundler.
import type { BrandProfile } from "../../brand/domain/brand-profile";
import { defaultBrand } from "../../brand/domain/default-brand";
import type { ContentPiece } from "./content-piece";
import type { DecisionQuestions } from "./decision";

/** Choice key for content outside the brand's topics. The policy only checks this one. */
export const OTHER_TOPIC = "other";

const TOPIC_KEY_PREFIX = "topic_";

/** Spanish label for the "other" topic. */
const OTHER_TOPIC_LABEL = "Otro";

/**
 * Topic options from the brand: `topic_1..topic_n` (one per `brand.topics` entry, in
 * order) plus `other`. Keys are positional, so they stay stable while the brand's
 * topic list keeps its order.
 */
export function buildTopicOptions(brand: BrandProfile): Record<string, string> {
	const topics = brand.topics.map((topic) => topic.trim()).filter(Boolean);
	const options: Record<string, string> = {};
	if (topics.length === 0) {
		// A choice needs at least two options; fall back to the brand's own description.
		options[`${TOPIC_KEY_PREFIX}1`] = `Temas propios de ${brand.name}: ${brand.description}`;
	}
	topics.forEach((topic, index) => {
		options[`${TOPIC_KEY_PREFIX}${index + 1}`] = topic;
	});
	options[OTHER_TOPIC] = "Ninguno de los anteriores o no se puede identificar un tema claro.";
	return options;
}

/** Spanish label of a topic answer for the UI: the brand topic, "Otro", or the raw key. */
export function topicLabel(brand: BrandProfile, key: string): string {
	if (key === OTHER_TOPIC) return OTHER_TOPIC_LABEL;
	if (key.startsWith(TOPIC_KEY_PREFIX)) {
		const index = Number(key.slice(TOPIC_KEY_PREFIX.length)) - 1;
		const topic = Number.isInteger(index) ? brand.topics[index]?.trim() : undefined;
		if (topic) return topic;
		if (index === 0 && brand.topics.length === 0) return `Temas de ${brand.name}`;
	}
	return key;
}

/** "Fundadores y ejecutivos" → "fundadores y ejecutivos"; leaves acronyms ("IA …") alone. */
function lowerFirst(text: string): string {
	const trimmed = text.trim();
	if (trimmed.length < 2 || trimmed[1] !== trimmed[1].toLowerCase()) return trimmed;
	return trimmed[0].toLowerCase() + trimmed.slice(1);
}

function listOf(items: readonly string[]): string {
	return items
		.map((item) => item.trim())
		.filter(Boolean)
		.join("; ");
}

function offersUnsoldProductInstructions(brand: BrandProfile): string {
	const offerings = listOf(brand.offerings);
	if (!offerings) {
		return `${brand.name} no declaró productos ni servicios a la venta. ¿La pieza ofrece o promete algún producto o servicio pago?`;
	}
	return `¿La pieza ofrece o promete algo que ${brand.name} no vende? ${brand.name} vende solo: ${offerings}. Responde sí si ofrece algún producto o servicio que no esté en esa lista.`;
}

function brandRiskInstructions(brand: BrandProfile): string {
	const forbidden = listOf(brand.forbidden);
	const topics = forbidden
		? `toca temas que ${brand.name} nunca publica (${forbidden}), `
		: "toca política partidista o temas sensibles, ";
	const tone = brand.tone.trim()
		? ` o contradice claramente el tono de la marca ("${brand.tone.trim()}")`
		: "";
	return `¿La pieza ${topics}ataca a personas o empresas${tone}, de forma que pueda dañar la marca ${brand.name}?`;
}

function editorialFitInstructions(brand: BrandProfile): string {
	const topics = listOf(brand.topics);
	const tone = brand.tone.trim();
	const parts = [
		topics ? `trata temas de la marca (${topics})` : null,
		tone ? `respeta su tono ("${tone}")` : null,
		brand.audience.trim() ? `le habla a su audiencia (${lowerFirst(brand.audience.trim())})` : null,
	].filter(Boolean);
	const detail = parts.length > 0 ? `: ${parts.join(", ")}` : "";
	return `¿La pieza encaja con la línea editorial de ${brand.name}${detail}?`;
}

/**
 * Typed questions the decision engine answers about each piece in a single pass,
 * judged against the given brand (audience, offerings, tone, topics, forbidden).
 *
 * Instructions are in Spanish because the content is Spanish and they go to the model.
 * Each question asks for ONE observable judgment; arithmetic and thresholds live in
 * `editorial-policy.ts`, never here. Keys are fixed: the policy depends on them.
 */
export function buildEditorialQuestions(brand: BrandProfile) {
	const audience = brand.audience.trim();
	return {
		topic: {
			type: "choice",
			instructions: `¿Cuál es el tema principal de la pieza, entre los temas de ${brand.name}?`,
			options: buildTopicOptions(brand),
		},
		format: {
			type: "choice",
			instructions: "¿Qué formato tiene la pieza?",
			options: {
				post: "Publicación escrita para redes sociales.",
				video_script: "Guion para un video.",
				clip: "Texto o transcripción de un clip corto de video.",
				newsletter: "Correo o edición de newsletter.",
				other: "Otro formato o no se puede determinar.",
			},
		},
		relevance: {
			type: "score",
			instructions: audience
				? `¿Qué tan relevante es la pieza para ${lowerFirst(audience)}?`
				: `¿Qué tan relevante es la pieza para la audiencia de ${brand.name}?`,
			levels: [
				{ label: "Baja", description: "No les sirve o no trata problemas que les importen." },
				{ label: "Media", description: "Toca un tema de su interés de forma general." },
				{ label: "Alta", description: "Aborda un problema concreto y actual para ellos." },
			],
		},
		actionable: {
			type: "score",
			instructions: "¿La pieza deja algo útil que el lector pueda aplicar?",
			levels: [
				{ label: "Nada", description: "Solo opinión o anuncio, sin nada que aplicar." },
				{ label: "Algo", description: "Da una idea general que se podría aplicar." },
				{ label: "Mucho", description: "Da pasos, ejemplos o marcos concretos para aplicar." },
			],
		},
		too_promotional: {
			type: "yes_no",
			instructions:
				"¿La mayor parte de la pieza está dedicada a vender o promocionar un producto en lugar de aportar contenido?",
		},
		exaggerated_promises: {
			type: "yes_no",
			instructions:
				"¿La pieza promete resultados garantizados o exagerados (por ejemplo, duplicar ventas en días o éxito asegurado)?",
		},
		unsourced_claims: {
			type: "yes_no",
			instructions: "¿La pieza menciona datos, cifras o estudios sin indicar de dónde vienen?",
		},
		brand_risk: {
			type: "yes_no",
			instructions: brandRiskInstructions(brand),
		},
		offers_unsold_product: {
			type: "yes_no",
			instructions: offersUnsoldProductInstructions(brand),
		},
		is_spam: {
			type: "yes_no",
			instructions:
				"¿La pieza es spam: texto sin sentido, repetitivo, con enlaces sospechosos o sin relación con el negocio de la marca?",
		},
		// Informative only: shown to the editor and used to prioritize, never to approve or
		// reject. JEV can't know future engagement, so the levels describe observable traits.
		reach_potential: {
			type: "score",
			instructions:
				"Según lo que se ve en la pieza, ¿qué potencial tiene de generar interacción y compartirse en redes?",
			levels: [
				{
					label: "Bajo",
					description:
						"Sin gancho inicial, mensaje difuso o genérico; poco motivo para comentar o compartir.",
				},
				{
					label: "Medio",
					description:
						"Tema de interés con algún gancho, pero sin un dato, historia u opinión que destaque.",
				},
				{
					label: "Alto",
					description:
						"Gancho claro desde la primera línea, una idea concreta y memorable (dato, historia u opinión fuerte) y una invitación a interactuar.",
				},
			],
		},
		editorial_fit: {
			type: "yes_no",
			instructions: editorialFitInstructions(brand),
		},
	} as const satisfies DecisionQuestions;
}

export type EditorialQuestions = ReturnType<typeof buildEditorialQuestions>;

export type EditorialQuestionKey = keyof EditorialQuestions;

/** Questions for the default 30X brand. Kept for code that does not know the brand yet. */
export const editorialQuestions: EditorialQuestions = buildEditorialQuestions(defaultBrand);

/**
 * State sent to the model for one piece. Leaves out `author` and `expectedRoute`:
 * the model judges the content only, and must never see the expected answer.
 */
export function buildContentInput(
	piece: ContentPiece,
	brand: BrandProfile,
): Record<string, unknown> {
	const input: Record<string, unknown> = {
		title: piece.title,
		body: piece.body,
		format: piece.format,
		channel: piece.channel,
		brand: { name: brand.name, tone: brand.tone },
	};
	if (piece.imageDataUrl) {
		input.note = SCREENSHOT_NOTE;
	}
	return input;
}

/** Tells the model to read the screenshot as part of the piece (it may be the only content). */
export const SCREENSHOT_NOTE =
	"La pieza incluye una captura (publicación, diapositiva o miniatura). Júzgala como parte de la pieza: lee el texto visible en la imagen y considera lo que muestra. Si el campo body está vacío, la captura es todo el contenido.";
