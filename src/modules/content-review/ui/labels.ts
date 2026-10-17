import type { BrandProfile } from "@/modules/brand/domain/brand-profile";
import { defaultBrand } from "@/modules/brand/domain/default-brand";
import type { ContentChannel, ContentFormat, ContentPiece } from "../domain/content-piece";
import type { DecisionProvider } from "../domain/decision";
import type { EditorialPolicy, Route } from "../domain/editorial-policy";
import { editorialQuestions, topicLabel } from "../domain/editorial-questions";
import type { ReviewResult } from "../domain/review";

/** Spanish labels and route styling shared by the panel components. */

export const ROUTES: readonly Route[] = [
	"AUTO_APPROVE",
	"ENRICH_WITH_LLM",
	"HUMAN_REVIEW",
	"REJECT",
];

export const ROUTE_LABEL: Record<Route, string> = {
	AUTO_APPROVE: "Aprobado",
	ENRICH_WITH_LLM: "Mejorar con IA",
	HUMAN_REVIEW: "Revisar",
	REJECT: "Descartado",
};

export const ROUTE_HINT: Record<Route, string> = {
	AUTO_APPROVE: "Se publica sin que hagas nada",
	ENRICH_WITH_LLM: "Casi lista: la IA propone cambios",
	HUMAN_REVIEW: "La decides tú",
	REJECT: "No se publica",
};

/** Literal class names so Tailwind can see them: dot, tinted pill background and pill text. */
export const ROUTE_STYLE: Record<Route, { dot: string; soft: string; ink: string }> = {
	AUTO_APPROVE: { dot: "bg-approve", soft: "bg-approve-soft", ink: "text-approve-ink" },
	ENRICH_WITH_LLM: { dot: "bg-enrich", soft: "bg-enrich-soft", ink: "text-enrich-ink" },
	HUMAN_REVIEW: { dot: "bg-human", soft: "bg-human-soft", ink: "text-human-ink" },
	REJECT: { dot: "bg-reject", soft: "bg-reject-soft", ink: "text-reject-ink" },
};

export const FORMAT_LABEL: Record<ContentFormat, string> = {
	post: "Post",
	video_script: "Guion de video",
	clip: "Clip",
	newsletter: "Newsletter",
};

export const CHANNEL_LABEL: Record<ContentChannel, string> = {
	linkedin: "LinkedIn",
	instagram: "Instagram",
	youtube: "YouTube",
	x: "X",
	newsletter: "Newsletter",
	blog: "Blog",
};

const CHANNEL_PHRASE: Record<ContentChannel, string> = {
	linkedin: "en LinkedIn",
	instagram: "en Instagram",
	youtube: "en YouTube",
	x: "en X",
	newsletter: "para la newsletter",
	blog: "para el blog",
};

/** "Post en LinkedIn", "Guion de video en YouTube", "Newsletter". */
export function describePiece(piece: Pick<ContentPiece, "format" | "channel">): string {
	if (piece.format === "newsletter" && piece.channel === "newsletter") return "Newsletter";
	return `${FORMAT_LABEL[piece.format]} ${CHANNEL_PHRASE[piece.channel]}`;
}

export const PROVIDER_LABEL: Record<DecisionProvider, string> = {
	jev: "JEV",
	openai: "OpenAI",
};

/** Answer keys in display order, with their Spanish names. */
export const QUESTION_LABEL = {
	topic: "Tema",
	format: "Formato detectado",
	relevance: "Relevancia para ejecutivos",
	actionable: "Aporte para la audiencia",
	too_promotional: "Demasiado promocional",
	exaggerated_promises: "Promesas exageradas",
	unsourced_claims: "Datos sin fuente",
	brand_risk: "Riesgo de marca",
	offers_unsold_product: "Ofrece algo que la marca no vende",
	is_spam: "Spam",
	reach_potential: "Potencial de alcance",
	editorial_fit: "Encaja con la línea editorial",
} as const;

export const CHOICE_KEYS = ["topic", "format"] as const;
export const SCORE_KEYS = ["relevance", "actionable", "reach_potential"] as const;
export const FLAG_KEYS = [
	"brand_risk",
	"exaggerated_promises",
	"offers_unsold_product",
	"too_promotional",
	"unsourced_claims",
	"is_spam",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

/**
 * Plain-language highlights for the editor: reach potential (Bajo/Medio/Alto) and
 * editorial fit. Informative only; the policy never uses them to approve or reject.
 */
export function pieceHighlights(answers: ReviewResult["answers"]): {
	reach: string | null;
	fit: string | null;
} {
	const reach = answers.reach_potential;
	const fit = answers.editorial_fit;
	const levels = editorialQuestions.reach_potential.levels;
	return {
		reach:
			reach?.type === "score"
				? (levels[Math.min(levels.length - 1, Math.max(0, Math.round(reach.score)))]?.label ?? null)
				: null,
		fit:
			fit?.type === "yes_no"
				? fit.probability >= 0.7
					? "Sí"
					: fit.probability >= 0.4
						? "En parte"
						: "No"
				: null,
	};
}

const FORMAT_OPTION_LABEL: Record<string, string> = {
	post: "Post",
	video_script: "Guion de video",
	clip: "Clip",
	newsletter: "Newsletter",
	other: "Otro",
};

/**
 * Spanish label of a choice answer. Topic keys (`topic_1..topic_n`, `other`) come from
 * the brand the piece was judged against, so they need that brand to be readable.
 */
export function choiceOptionLabel(
	key: (typeof CHOICE_KEYS)[number],
	option: string,
	brand: BrandProfile,
): string {
	if (key === "topic") return topicLabel(brand, option);
	return FORMAT_OPTION_LABEL[option] ?? option;
}

/**
 * Brand a result was judged against: dataset pieces use the 30X default brand,
 * pasted pieces the signed-in user's brand.
 */
export function brandForResult(
	result: Pick<ReviewResult, "brandId">,
	sessionBrand: BrandProfile | null,
): BrandProfile {
	if (!result.brandId || result.brandId === defaultBrand.id) return defaultBrand;
	return sessionBrand ?? defaultBrand;
}

export function scoreLevelLabels(key: (typeof SCORE_KEYS)[number]): string[] {
	return editorialQuestions[key].levels.map((level) => level.label);
}

/** Thresholds of the current policy that apply to a yes/no flag, for bar markers. */
export function flagMarkers(
	key: FlagKey,
	policy: EditorialPolicy,
): { value: number; label: string }[] {
	const markers = [{ value: policy.flagThreshold, label: "Umbral de alerta" }];
	if (key === "brand_risk" || key === "exaggerated_promises" || key === "offers_unsold_product") {
		markers.push({ value: policy.riskBlock, label: "Bloqueo por riesgo" });
	}
	if (key === "is_spam") markers.push({ value: policy.spamReject, label: "Descarte por spam" });
	return markers;
}

/** Slider definitions for "Ajustes avanzados" in the policy screen, in plain words. */
export const POLICY_FIELDS: readonly {
	key: Exclude<keyof EditorialPolicy, "weights">;
	label: string;
	description: string;
}[] = [
	{
		key: "autoApproveConfidence",
		label: "Qué tan seguro debe estar para aprobar solo",
		description: "Más alto: aprueba solo cuando lo tiene muy claro y te llegan más piezas.",
	},
	{
		key: "grayZoneFloor",
		label: "Cuándo te la pasa a ti",
		description:
			"Si está menos seguro que esto, la decides tú. Entre medias, la IA propone mejoras.",
	},
	{
		key: "minEditorialScore",
		label: "Calidad mínima para aprobar",
		description: "Cuánto valor debe aportar a tu audiencia: útil, relevante y sin tono de anuncio.",
	},
	{
		key: "flagThreshold",
		label: "Sensibilidad a señales de alerta",
		description:
			"Más bajo: cualquier señal (tono de anuncio, datos sin fuente) frena la aprobación.",
	},
	{
		key: "riskBlock",
		label: "Riesgo para tu marca",
		description: "Desde aquí, promesas exageradas o productos que no vendes llegan a ti.",
	},
	{
		key: "spamReject",
		label: "Descartar spam desde",
		description: "Desde aquí, lo que parece spam se descarta sin pasar por ti.",
	},
];

/**
 * Image to show for a piece: the screenshot of a submitted piece when the API echoed it
 * back, otherwise the bundled sample image of a dataset piece ("/samples/cp-001.jpg").
 */
export function pieceImage(piece: ContentPiece): string | null {
	const value: unknown = (piece as ContentPiece & { imageDataUrl?: unknown }).imageDataUrl;
	if (typeof value === "string" && value.startsWith("data:image/")) return value;
	const path: unknown = piece.imagePath;
	return typeof path === "string" &&
		(path.startsWith("/samples/") || path.startsWith("/api/pieces/"))
		? path
		: null;
}

export const EDITOR_ACTION_LABEL = {
	approved: "Aprobada por ti",
	rejected: "Rechazada por ti",
	adjusted: "Aprobada con mejoras de la IA",
} as const;

/** Short, friendly sentence for each rule that can fire (see decideRoute). */
const REASON_TEXT: Record<string, string> = {
	is_spam: "Parece spam",
	brand_risk: "Podría dañar la imagen de tu marca",
	exaggerated_promises: "Promete resultados exagerados",
	offers_unsold_product: "Vende algo que tu marca no ofrece",
	too_promotional: "Suena demasiado a anuncio",
	unsourced_claims: "Da datos sin decir de dónde salen",
	topic: "No encaja con los temas de tu marca",
	editorial_score: "Le falta un aporte claro (dato, historia o siguiente paso)",
	min_confidence: "La IA no lo tiene del todo claro",
};

/** At most `limit` plain-language reasons, without duplicates or numbers. */
export function friendlyReasons(
	result: Pick<ReviewResult, "reasons" | "error">,
	limit = 3,
): string[] {
	if (result.error) return ["No pudimos analizarla por completo"];
	const texts = result.reasons.map((reason) =>
		reason.check.startsWith("missing_")
			? "No pudimos analizarla por completo"
			: (REASON_TEXT[reason.check] ?? reason.message.replace(/\s*\([\d,.]+\)$/, "")),
	);
	return [...new Set(texts)].slice(0, limit);
}

export type Certainty = "alta" | "media" | "baja";

/** "Seguridad de la decisión" in words, against the current policy's confidence gates. */
export function decisionCertainty(minConfidence: number, policy: EditorialPolicy): Certainty {
	if (minConfidence >= policy.autoApproveConfidence) return "alta";
	if (minConfidence >= policy.grayZoneFloor) return "media";
	return "baja";
}
