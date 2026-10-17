/**
 * A person who signs up (e.g. on Luma), as the segmentation sees them.
 *
 * `LeadProfile` holds ONLY what a new sign-up provides. 30X's own labels and CRM
 * outcomes live apart in `ProfileLabels`, so they can never leak into the decision
 * engine input (see `toDecisionInput`).
 */

/** Values as they appear in 30X's sheet (Spanish), e.g. "Fundador, socio o CEO". */
export interface LeadProfile {
	rol: string;
	pais: string;
	dolor: string;
	objetivo: string;
	/** Topic tags in 30X's sheet are English ("sales", "ai", "gtm"…). */
	temas: readonly string[];
	relacion: string;
	/** "Baja" | "Media" | "Alta". Estimated by code for live sign-ups (`estimateInfoLevel`). */
	nivelInfo: InfoLevel;
}

export type InfoLevel = "Baja" | "Media" | "Alta";

export const INFO_LEVELS: readonly InfoLevel[] = ["Baja", "Media", "Alta"];

/** 30X's labels and CRM outcome for a dataset row. Ground truth only: never sent to the engine. */
export interface ProfileLabels {
	/** Program key (see `PROGRAMS`), "none" for "Sin programa sugerido". */
	programaSugerido: ProgramKey;
	afinidad: number;
	/** "0-3 (baja)" | "4-6 (media)" | "7-8 (alta)" | "9-10 (muy alta)". */
	bandaAfinidad: string;
	estado: string;
	etapaCrm: string;
	programa: string;
}

export interface DatasetProfile {
	id: string;
	profile: LeadProfile;
	labels: ProfileLabels;
}

export type ProgramKey =
	| "ai_sales"
	| "inmersion_ejecutiva"
	| "sales_machine"
	| "hardcore_ai"
	| "achievers"
	| "none";

/** Spanish names shown in the UI, keyed by stable program ids. */
export const PROGRAM_LABEL: Record<ProgramKey, string> = {
	ai_sales: "AI Sales",
	inmersion_ejecutiva: "Inmersión Ejecutiva",
	sales_machine: "Sales Machine",
	hardcore_ai: "Hardcore AI",
	achievers: "Achievers",
	none: "Sin programa claro",
};

export const PROGRAM_KEYS = Object.keys(PROGRAM_LABEL) as ProgramKey[];

/** 30X's "Programa sugerido" text → program key. Unknown text → null. */
export function programKeyFromLabel(label: string): ProgramKey | null {
	const normalized = label.trim().toLowerCase();
	if (normalized === "sin programa sugerido") return "none";
	for (const key of PROGRAM_KEYS) {
		if (PROGRAM_LABEL[key].toLowerCase() === normalized) return key;
	}
	return null;
}

/** "9-10 (muy alta)" and "7-8 (alta)" count as high affinity. */
export function isHighAffinity(band: string): boolean {
	return /\((muy )?alta\)/i.test(band);
}

/** Topic tags → Spanish words for the engine and the UI. Unknown tags pass through. */
export const TOPIC_LABEL: Record<string, string> = {
	ai: "IA",
	sales: "ventas",
	ops: "operaciones",
	gtm: "salida al mercado",
	leadership: "liderazgo",
	marketing: "marketing",
	fundraising: "levantar capital",
	finance: "finanzas",
	product: "producto",
	pricing: "precios",
	hiring: "contratación",
	negotiation: "negociación",
	retention: "retención de clientes",
};

export function topicLabel(tag: string): string {
	return TOPIC_LABEL[tag] ?? tag;
}

/** Placeholder values in 30X's sheet that mean "unknown". */
const UNKNOWN_VALUES = new Set(["", "—", "sin dato", "sin dato de rol", "no declaró ningún dolor"]);

export function isKnown(value: string): boolean {
	return !UNKNOWN_VALUES.has(value.trim().toLowerCase());
}

/**
 * Tunable rule to estimate "Nivel de info" for a live sign-up: one point per declared
 * topic and per known field (rol, país, dolor). Data, not code.
 */
export const infoLevelRule = { mediaFrom: 3, altaFrom: 5 };

export function estimateInfoLevel(
	profile: Omit<LeadProfile, "nivelInfo">,
	rule = infoLevelRule,
): InfoLevel {
	const points =
		profile.temas.length +
		[profile.rol, profile.pais, profile.dolor].filter((value) => isKnown(value)).length;
	if (points >= rule.altaFrom) return "Alta";
	if (points >= rule.mediaFrom) return "Media";
	return "Baja";
}

/**
 * What the decision engine sees: only sign-up fields, in Spanish. Built field by
 * field (never by spreading), so a label column can't slip in.
 */
export function toDecisionInput(profile: LeadProfile): Record<string, string> {
	const show = (value: string) => (isKnown(value) ? value.trim() : "Sin dato");
	return {
		rol: show(profile.rol),
		pais: show(profile.pais),
		dolor_principal: show(profile.dolor),
		objetivo_principal: show(profile.objetivo),
		temas_de_interes:
			profile.temas.length > 0 ? profile.temas.map(topicLabel).join(", ") : "Sin dato",
		relacion_con_30x: show(profile.relacion),
		nivel_de_informacion: profile.nivelInfo,
	};
}
