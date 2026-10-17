import type { CSSProperties } from "react";
import { readableInk } from "@/shared/ui/contrast";

/**
 * CSS variables that tint a subtree with the brand: `--brand` (active nav, accents)
 * and `--primary` (primary buttons), each with black/white ink picked by luminance.
 */
export function brandStyle(color: string): CSSProperties {
	const ink = readableInk(color);
	return {
		"--brand": color,
		"--brand-ink": ink,
		"--primary": color,
		"--primary-ink": ink,
	} as CSSProperties;
}
