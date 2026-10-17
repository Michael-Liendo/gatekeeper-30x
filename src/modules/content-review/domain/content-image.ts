import type { DecisionImage } from "./decision";

/** Max decoded size of a screenshot attached to a piece: 4 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const DATA_URL_PATTERN = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

/** Decoded byte length of a base64 string, without decoding it. */
export function base64DecodedBytes(base64: string): number {
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Parses a PNG/JPEG base64 `data:` URL into the image sent to the decision engine.
 * Returns null when the prefix, the base64 or the size (> 4 MB decoded) is invalid.
 */
export function parseImageDataUrl(dataUrl: string): DecisionImage | null {
	const match = DATA_URL_PATTERN.exec(dataUrl);
	if (!match) return null;
	const [, mimeType, base64] = match;
	if (!base64 || base64.length % 4 !== 0) return null;
	const bytes = base64DecodedBytes(base64);
	if (bytes === 0 || bytes > MAX_IMAGE_BYTES) return null;
	return { mimeType: mimeType as DecisionImage["mimeType"], base64 };
}

/** Rebuilds the `data:` URL of an image. */
export function toImageDataUrl(image: DecisionImage): string {
	return `data:${image.mimeType};base64,${image.base64}`;
}
