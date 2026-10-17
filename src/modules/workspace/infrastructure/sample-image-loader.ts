import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MAX_IMAGE_BYTES } from "@/modules/content-review/domain/content-image";
import type { DecisionImage } from "@/modules/content-review/domain/decision";

/** Only bundled sample images: "/samples/<name>.<jpg|jpeg|png>". */
const SAMPLE_PATH = /^\/samples\/[\w-]+\.(jpg|jpeg|png)$/;

/**
 * Reads a sample's bundled image from `publicDir` (default `public/`). Returns null when
 * the path is not a sample path, the file is missing or it is too large for JEV.
 */
export function createSampleImageLoader(publicDir: string) {
	return async (imagePath: string): Promise<DecisionImage | null> => {
		const match = SAMPLE_PATH.exec(imagePath);
		if (!match) return null;
		try {
			const bytes = await readFile(path.join(publicDir, imagePath));
			if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;
			return {
				mimeType: match[1] === "png" ? "image/png" : "image/jpeg",
				base64: bytes.toString("base64"),
			};
		} catch {
			return null;
		}
	};
}

/** Shared, cached loader (same one the batch review uses), so both read each file once. */
export { loadSampleImage } from "@/modules/content-review/infrastructure/sample-images";
