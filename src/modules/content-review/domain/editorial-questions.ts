import type { ContentPiece } from "./content-piece";
import type { DecisionQuestions } from "./decision";

/**
 * Typed questions the decision engine answers about each piece in a single pass.
 *
 * Instructions are in Spanish because the content is Spanish and they go to the model.
 * Each question asks for ONE observable judgment; arithmetic and thresholds live in
 * `editorial-policy.ts`, never here.
 */
export const editorialQuestions = {
	topic: {
		type: "choice",
		instructions: "¿Cuál es el tema principal de la pieza?",
		options: {
			ai: "Inteligencia artificial: herramientas, casos de uso o estrategia de IA en empresas.",
			sales: "Ventas: prospección, cierre, procesos comerciales o equipos de ventas.",
			growth: "Growth y marketing: adquisición, retención, métricas de crecimiento.",
			startups_fundraising: "Startups y levantamiento de capital: inversión, rondas, emprender.",
			leadership: "Liderazgo: gestión de equipos, cultura, toma de decisiones ejecutivas.",
			other: "Ninguno de los anteriores o no se puede identificar un tema claro.",
		},
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
		instructions:
			"¿Qué tan relevante es la pieza para fundadores y ejecutivos de empresas en Latinoamérica?",
		levels: [
			{ label: "Baja", description: "No les sirve o no trata problemas de su negocio." },
			{ label: "Media", description: "Toca un tema de su interés de forma general." },
			{ label: "Alta", description: "Aborda un problema concreto y actual de su negocio." },
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
		instructions:
			"¿La pieza toca política partidista, ataca a personas o empresas, o trata temas sensibles que pueden dañar la marca?",
	},
	offers_unsold_product: {
		type: "yes_no",
		instructions:
			"30X solo vende: Inmersión Ejecutiva, programas de Ventas, Growth e IA, clases gratis y su comunidad. ¿La pieza ofrece o promete algún producto o servicio que no esté en esa lista?",
	},
	is_spam: {
		type: "yes_no",
		instructions:
			"¿La pieza es spam: texto sin sentido, repetitivo, con enlaces sospechosos o sin relación con negocios?",
	},
} as const satisfies DecisionQuestions;

export type EditorialQuestionKey = keyof typeof editorialQuestions;

/**
 * State sent to the model for one piece. Leaves out `author` and `expectedRoute`:
 * the model judges the content only, and must never see the expected answer.
 */
export function buildContentInput(piece: ContentPiece): Record<string, unknown> {
	const input: Record<string, unknown> = {
		title: piece.title,
		body: piece.body,
		format: piece.format,
		channel: piece.channel,
	};
	if (piece.imageDataUrl) {
		input.note = SCREENSHOT_NOTE;
	}
	return input;
}

/** Tells the model to read the screenshot as part of the piece (it may be the only content). */
export const SCREENSHOT_NOTE =
	"La pieza incluye una captura (publicación, diapositiva o miniatura). Júzgala como parte de la pieza: lee el texto visible en la imagen y considera lo que muestra. Si el campo body está vacío, la captura es todo el contenido.";
