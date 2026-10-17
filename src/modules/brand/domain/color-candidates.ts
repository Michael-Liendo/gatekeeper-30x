/**
 * Pure helpers to turn raw CSS color mentions found on a website into a short,
 * ranked list of brand color candidates (#RRGGBB).
 */

/** A color mention and how much it counts (theme-color or CSS variables count more). */
export interface ColorMention {
	color: string;
	weight?: number;
}

/** Tunable rules for ranking. Data, not code: adjust without touching the logic. */
export interface ColorRankingConfig {
	/** Max candidates returned. */
	limit: number;
	/** HSL lightness above which a color counts as near-white (0–1). */
	nearWhiteLightness: number;
	/** HSL lightness below which a color counts as near-black (0–1). */
	nearBlackLightness: number;
	/** HSL saturation below which a color counts as grey (0–1). */
	greySaturation: number;
	/** Colors at or below this alpha are ignored (overlays, shadows). */
	minAlpha: number;
	/**
	 * Defaults injected by site builders rather than chosen by the brand
	 * (e.g. Framer's link blue). Ranked after every other non-neutral color.
	 */
	builderDefaults: string[];
	/**
	 * RGB distance (0–441) under which two colors count as shades of the same one;
	 * the lighter-weight shade is folded into the heavier.
	 */
	mergeDistance: number;
}

export const defaultColorRankingConfig: ColorRankingConfig = {
	limit: 6,
	nearWhiteLightness: 0.94,
	nearBlackLightness: 0.08,
	greySaturation: 0.1,
	minAlpha: 0.5,
	builderDefaults: ["#0099FF"],
	mergeDistance: 60,
};

const toHexByte = (n: number) =>
	Math.max(0, Math.min(255, Math.round(n)))
		.toString(16)
		.padStart(2, "0")
		.toUpperCase();

/**
 * Normalizes `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` to `#RRGGBB`.
 * Returns null for anything else or for mostly transparent colors.
 */
export function normalizeColor(
	raw: string,
	minAlpha = defaultColorRankingConfig.minAlpha,
): string | null {
	const value = raw.trim().toLowerCase();

	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
	if (hex) {
		let digits = hex[1];
		if (digits.length <= 4) {
			digits = [...digits].map((d) => d + d).join("");
		}
		if (digits.length === 8) {
			const alpha = Number.parseInt(digits.slice(6, 8), 16) / 255;
			if (alpha <= minAlpha) return null;
		}
		return `#${digits.slice(0, 6).toUpperCase()}`;
	}

	const rgb =
		/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
			value,
		);
	if (rgb) {
		const channel = (c: string) =>
			c.endsWith("%") ? (Number.parseFloat(c) / 100) * 255 : Number.parseFloat(c);
		const channels = [rgb[1], rgb[2], rgb[3]].map(channel);
		if (channels.some((c) => Number.isNaN(c))) return null;
		if (rgb[4] !== undefined) {
			const a = rgb[4].endsWith("%") ? Number.parseFloat(rgb[4]) / 100 : Number.parseFloat(rgb[4]);
			if (Number.isNaN(a) || a <= minAlpha) return null;
		}
		return `#${channels.map(toHexByte).join("")}`;
	}
	return null;
}

const HEX_TOKEN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g;
const RGB_TOKEN = /rgba?\([^()]*\)/gi;

/** Finds color tokens inside a CSS value (not selectors), e.g. `1px solid #ABC`. */
export function findColorTokens(value: string): string[] {
	return [...(value.match(HEX_TOKEN) ?? []), ...(value.match(RGB_TOKEN) ?? [])];
}

/**
 * Extracts color mentions from a CSS text (a `<style>` block or a `style` attribute).
 * Only declaration values are scanned, so selectors like `#fade {}` are not colors.
 * Values of custom properties (`--brand: #f00`) weigh double: they are design tokens.
 */
export function colorMentionsFromCss(css: string): ColorMention[] {
	const mentions: ColorMention[] = [];
	const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
	const declaration = /([-\w]+)\s*:\s*([^;{}]+)/g;
	for (const match of clean.matchAll(declaration)) {
		const weight = match[1].startsWith("--") ? 2 : 1;
		for (const token of findColorTokens(match[2])) {
			mentions.push({ color: token, weight });
		}
	}
	return mentions;
}

interface Hsl {
	h: number;
	s: number;
	l: number;
}

function toHsl(hex: string): Hsl {
	const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
	const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
	const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return { h: 0, s: 0, l };
	const s = d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === r) h = ((g - b) / d) % 6;
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return { h: (h * 60 + 360) % 360, s, l };
}

/** Near-white, near-black or grey: a background/text color, not a brand color. */
export function isNeutralColor(
	hex: string,
	config: Pick<
		ColorRankingConfig,
		"nearWhiteLightness" | "nearBlackLightness" | "greySaturation"
	> = defaultColorRankingConfig,
): boolean {
	const { s, l } = toHsl(hex);
	return (
		l >= config.nearWhiteLightness || l <= config.nearBlackLightness || s < config.greySaturation
	);
}

function rgbDistance(a: string, b: string): number {
	let sum = 0;
	for (let i = 1; i < 7; i += 2) {
		const d = Number.parseInt(a.slice(i, i + 2), 16) - Number.parseInt(b.slice(i, i + 2), 16);
		sum += d * d;
	}
	return Math.sqrt(sum);
}

/**
 * Folds near-identical shades together (hover/tint variants of one brand color).
 * `list` is sorted by weight, so each cluster is represented by its heaviest shade;
 * clusters are re-sorted by their combined weight.
 */
function mergeShades(
	list: string[],
	totals: Map<string, number>,
	firstSeen: Map<string, number>,
	distance: number,
): string[] {
	const clusters: Array<{ hex: string; weight: number }> = [];
	for (const hex of list) {
		const near = clusters.find((c) => rgbDistance(c.hex, hex) < distance);
		if (near) near.weight += totals.get(hex)!;
		else clusters.push({ hex, weight: totals.get(hex)! });
	}
	return clusters
		.sort((a, b) => b.weight - a.weight || firstSeen.get(a.hex)! - firstSeen.get(b.hex)!)
		.map((c) => c.hex);
}

/**
 * Ranks color mentions by total weight, normalized to `#RRGGBB`. Neutral colors
 * (near-white, near-black, greys) and builder defaults are dropped when there are
 * other candidates; if neutrals are all there is, they are returned instead. Shades
 * closer than `mergeDistance` are folded into one candidate.
 */
export function rankColorCandidates(
	mentions: ReadonlyArray<ColorMention | string>,
	config: ColorRankingConfig = defaultColorRankingConfig,
): string[] {
	const totals = new Map<string, number>();
	const firstSeen = new Map<string, number>();
	mentions.forEach((mention, index) => {
		const { color, weight = 1 } = typeof mention === "string" ? { color: mention } : mention;
		const hex = normalizeColor(color, config.minAlpha);
		if (!hex) return;
		totals.set(hex, (totals.get(hex) ?? 0) + weight);
		if (!firstSeen.has(hex)) firstSeen.set(hex, index);
	});

	const byWeight = [...totals.keys()].sort(
		(a, b) => totals.get(b)! - totals.get(a)! || firstSeen.get(a)! - firstSeen.get(b)!,
	);
	const builderDefaults = new Set(config.builderDefaults.map((c) => c.toUpperCase()));
	const neutral = (hex: string) => isNeutralColor(hex, config);

	const brand = byWeight.filter((hex) => !neutral(hex) && !builderDefaults.has(hex));
	const defaults = byWeight.filter((hex) => !neutral(hex) && builderDefaults.has(hex));
	const merge = (list: string[]) => mergeShades(list, totals, firstSeen, config.mergeDistance);
	const chosen =
		brand.length > 0 || defaults.length > 0
			? [...merge(brand), ...merge(defaults)]
			: merge(byWeight);
	return chosen.slice(0, config.limit);
}
