import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MAX_IMAGE_BYTES } from "../domain/content-image";
import type { DecisionImage } from "../domain/decision";

/** Only bundled samples under `public/samples/` are readable; no traversal, PNG or JPEG only. */
const SAMPLE_PATH_PATTERN = /^\/samples\/[A-Za-z0-9_-]+\.(png|jpe?g)$/;

/** Decoded images by public path. Misses are not kept, so images generated later are picked up. */
const cache = new Map<string, Promise<DecisionImage | null>>();

async function readSampleImage(imagePath: string): Promise<DecisionImage | null> {
	const match = SAMPLE_PATH_PATTERN.exec(imagePath);
	if (!match) return null;
	// `public/` sits next to the server both in `next dev` and in the standalone Docker image.
	const file = path.join(process.cwd(), "public", imagePath);
	try {
		const bytes = await readFile(file);
		if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
			console.warn(`[sample-images] ${imagePath} is empty or over the size limit`);
			return null;
		}
		return {
			mimeType: match[1] === "png" ? "image/png" : "image/jpeg",
			base64: bytes.toString("base64"),
		};
	} catch {
		// Images are generated separately (scripts/generate-sample-images.mjs): review text-only.
		return null;
	}
}

/** Loads a bundled sample image (e.g. "/samples/cp-001.jpg") for the decision engine. */
export function loadSampleImage(imagePath: string): Promise<DecisionImage | null> {
	let pending = cache.get(imagePath);
	if (!pending) {
		pending = readSampleImage(imagePath);
		cache.set(imagePath, pending);
		void pending.then((image) => {
			if (!image) cache.delete(imagePath);
		});
	}
	return pending;
}
