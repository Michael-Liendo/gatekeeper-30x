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
	ENRICH_WITH_LLM: "Ajustar con IA",
	HUMAN_REVIEW: "Revisión humana",
	REJECT: "Descartado",
};

export const ROUTE_HINT: Record<Route, string> = {
	AUTO_APPROVE: "Se publica sin tocarla",
	ENRICH_WITH_LLM: "El LLM propone ajustes",
	HUMAN_REVIEW: "La decide una persona",
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
	actionable: "Utilidad práctica",
	too_promotional: "Demasiado promocional",
	exaggerated_promises: "Promesas exageradas",
	unsourced_claims: "Datos sin fuente",
	brand_risk: "Riesgo de marca",
	offers_unsold_product: "Ofrece algo que la marca no vende",
	is_spam: "Spam",
} as const;

export const CHOICE_KEYS = ["topic", "format"] as const;
export const SCORE_KEYS = ["relevance", "actionable"] as const;
export const FLAG_KEYS = [
	"brand_risk",
	"exaggerated_promises",
	"offers_unsold_product",
	"too_promotional",
	"unsourced_claims",
	"is_spam",
] as const;

export type FlagKey = (typeof FLAG_KEYS)[number];

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

/** Slider definitions for the editorial policy panel. */
export const POLICY_FIELDS: readonly {
	key: Exclude<keyof EditorialPolicy, "weights">;
	label: string;
	description: string;
}[] = [
	{
		key: "autoApproveConfidence",
		label: "Confianza para aprobar sola",
		description:
			"Todas las respuestas de JEV deben llegar a este nivel para publicar sin intervención.",
	},
	{
		key: "grayZoneFloor",
		label: "Piso de la zona gris",
		description:
			"Por debajo decide una persona. Entre este piso y la confianza para aprobar, ajusta el LLM.",
	},
	{
		key: "minEditorialScore",
		label: "Puntaje editorial mínimo",
		description: "Relevancia y utilidad, menos tono promocional y datos sin fuente.",
	},
	{
		key: "flagThreshold",
		label: "Umbral de alerta",
		description: "Una señal de sí/no desde este valor impide la aprobación automática.",
	},
	{
		key: "riskBlock",
		label: "Bloqueo por riesgo",
		description:
			"Riesgo de marca, promesas exageradas o productos que la marca no vende van a una persona.",
	},
	{
		key: "spamReject",
		label: "Descartar spam desde",
		description: "Con esta probabilidad de spam la pieza se descarta sin revisión.",
	},
];

/** Screenshot attached to a submitted piece, when the API echoed it back. */
export function pieceImage(piece: ContentPiece): string | null {
	const value: unknown = (piece as ContentPiece & { imageDataUrl?: unknown }).imageDataUrl;
	return typeof value === "string" && value.startsWith("data:image/") ? value : null;
}

export const EDITOR_ACTION_LABEL = {
	approved: "Excepción aprobada",
	rejected: "Rechazada por el editor",
	adjusted: "Aprobada con ajustes de IA",
} as const;
