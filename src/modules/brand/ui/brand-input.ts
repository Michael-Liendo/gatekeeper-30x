import { isHexColor } from "@/shared/ui/contrast";
import type { BrandProfile, BrandProfileDraft, BrandProfileInput } from "../domain/brand-profile";

/** Client-side helpers for the brand form: defaults, draft merge and validation. */

export const MIN_COLORS = 2;
export const MAX_COLORS = 4;
export const MAX_LINKS = 3;

const DEFAULT_COLORS = ["#111318", "#f5f6f8"];

export const EMPTY_BRAND_INPUT: BrandProfileInput = {
	name: "",
	description: "",
	audience: "",
	offerings: [],
	tone: "",
	topics: [],
	forbidden: [],
	colors: DEFAULT_COLORS,
	links: [],
};

export type BrandFormErrors = Partial<Record<"name" | "offerings" | "topics" | "colors", string>>;

function text(value: string | undefined, fallback: string): string {
	return value && value.trim() !== "" ? value.trim() : fallback;
}

function list(value: string[] | undefined, fallback: string[]): string[] {
	const clean = (value ?? []).map((item) => item.trim()).filter((item) => item !== "");
	return clean.length > 0 ? [...new Set(clean)] : fallback;
}

function padColors(colors: string[]): string[] {
	const valid = colors.map((color) => color.toLowerCase()).filter(isHexColor);
	const result = valid.slice(0, MAX_COLORS);
	for (const fallback of DEFAULT_COLORS) {
		if (result.length >= MIN_COLORS) break;
		if (!result.includes(fallback)) result.push(fallback);
	}
	return result;
}

/** Fills `base` with whatever the extractor found; empty draft fields keep the base value. */
export function mergeDraft(
	draft: BrandProfileDraft,
	base: BrandProfileInput = EMPTY_BRAND_INPUT,
): BrandProfileInput {
	const draftColors = (draft.colors ?? []).filter(isHexColor);
	return {
		name: text(draft.name, base.name),
		description: text(draft.description, base.description),
		audience: text(draft.audience, base.audience),
		offerings: list(draft.offerings, base.offerings),
		tone: text(draft.tone, base.tone),
		topics: list(draft.topics, base.topics),
		forbidden: list(draft.forbidden, base.forbidden),
		colors: padColors(draftColors.length > 0 ? draftColors : base.colors),
		links: list([...(draft.links ?? []), ...base.links], []).slice(0, MAX_LINKS),
		logoUrl: text(draft.logoUrl, base.logoUrl ?? "") || undefined,
	};
}

/** Editable fields of a saved brand. */
export function toBrandInput(brand: BrandProfile): BrandProfileInput {
	const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = brand;
	return { ...input, colors: padColors(input.colors) };
}

/**
 * Only the name is required: everything else is optional and comes pre-filled from the
 * brand's website when we could read it. Colors, when given, must be #RRGGBB.
 */
export function validateBrandInput(input: BrandProfileInput): BrandFormErrors {
	const errors: BrandFormErrors = {};
	if (input.name.trim() === "") errors.name = "Escribe el nombre de tu marca.";
	if (!input.colors.every(isHexColor)) {
		errors.colors = "Usa colores en formato #RRGGBB, por ejemplo #1F7A4D.";
	}
	return errors;
}

/**
 * Sensible defaults for the fields hidden under "Más detalles": topics start as what
 * the brand sells, so the short form is enough to finish.
 */
export function withDefaults(input: BrandProfileInput): BrandProfileInput {
	if (input.topics.length > 0 || input.offerings.length === 0) return input;
	return { ...input, topics: [...input.offerings] };
}

/** Trims text fields before sending. */
export function normalizeBrandInput(input: BrandProfileInput): BrandProfileInput {
	return {
		...input,
		name: input.name.trim(),
		description: input.description.trim(),
		audience: input.audience.trim(),
		tone: input.tone.trim(),
		colors: input.colors.map((color) => color.toLowerCase()),
		logoUrl: input.logoUrl?.trim() || undefined,
	};
}

/** Accepts "mimarca.com" as well as full URLs; returns null when it is not a web address. */
export function normalizeUrl(raw: string): string | null {
	const value = raw.trim();
	if (value === "") return null;
	const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
	try {
		const url = new URL(withScheme);
		return url.hostname.includes(".") ? url.toString() : null;
	} catch {
		return null;
	}
}

export function primaryColor(input: Pick<BrandProfileInput, "colors">): string {
	const first = input.colors[0];
	return first && isHexColor(first) ? first : DEFAULT_COLORS[0];
}
