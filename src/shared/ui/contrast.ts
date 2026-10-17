/** Color helpers for brand-tinted UI: hex validation and readable text color. */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const INK_DARK = "#000000";
export const INK_LIGHT = "#ffffff";

export function isHexColor(value: string): boolean {
	return HEX_COLOR.test(value);
}

function channel(hex: string, offset: number): number {
	const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #RRGGBB color (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
	return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG contrast ratio between two #RRGGBB colors (1–21). */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Black or white, whichever reads better on the given background. */
export function readableInk(background: string): typeof INK_DARK | typeof INK_LIGHT {
	if (!isHexColor(background)) return INK_LIGHT;
	return contrastRatio(background, INK_DARK) >= contrastRatio(background, INK_LIGHT)
		? INK_DARK
		: INK_LIGHT;
}
