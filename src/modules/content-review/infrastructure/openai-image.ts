import "server-only";
import OpenAI, { toFile } from "openai";
import { env } from "@/shared/config/env";
import type { ImageRegenerationInput } from "../application/regenerate-piece";
import { parseImageDataUrl, toImageDataUrl } from "../domain/content-image";
import { OPENAI_IMAGE_MODEL } from "./openai-models";

/** Image edits are slow; give them their own budget, separate from the text rewrite. */
export const IMAGE_TIMEOUT_MS = 60_000;

let client: OpenAI | undefined;

/** Created lazily so builds don't need the API key. */
function getOpenAI(): OpenAI {
	if (!env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
	return client;
}

function listOf(items: readonly string[]): string {
	return items
		.map((item) => item.trim())
		.filter(Boolean)
		.join(", ");
}

/** Prompt for the image model. Spanish copy, so the redrawn text stays in Spanish. */
export function buildImagePrompt(input: ImageRegenerationInput): string {
	const { brand } = input;
	const colors = listOf(brand.colors);
	const offerings = listOf(brand.offerings);
	return [
		`Edita esta pieza gráfica de ${brand.name} para redes sociales.`,
		"Mantén el layout, la composición, la jerarquía tipográfica y el estilo visual de la marca.",
		colors && `Usa la paleta de la marca: ${colors} (el primero es el color principal).`,
		"Reemplaza TODO el texto visible de la imagen por este texto corregido, en español, sin errores ortográficos:",
		`Título: «${input.title}».`,
		`Texto: «${input.body}».`,
		"Si el texto no cabe, usa solo el título y la idea principal del texto; no inventes texto nuevo.",
		"Elimina de la imagen cualquier promesa de resultados garantizados, cifras sin fuente",
		offerings
			? `y cualquier oferta de productos que la marca no vende (solo vende: ${offerings}).`
			: "y cualquier oferta de productos que la marca no vende.",
		input.failedChecks.length > 0 && `Problemas a corregir: ${input.failedChecks.join("; ")}.`,
		input.changes.length > 0 && `Cambios ya aplicados al texto: ${input.changes.join(" ")}`,
		"No agregues logotipos, personas reales ni marcas de terceros.",
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * Redraws a piece's screenshot with the corrected copy and the brand colors.
 * Returns a PNG `data:` URL that passes `parseImageDataUrl` (so JEV can judge it).
 */
export async function regenerateImage(input: ImageRegenerationInput): Promise<string> {
	const original = parseImageDataUrl(input.imageDataUrl);
	if (!original) throw new Error("Invalid original image");
	const extension = original.mimeType === "image/png" ? "png" : "jpg";
	const file = await toFile(Buffer.from(original.base64, "base64"), `pieza.${extension}`, {
		type: original.mimeType,
	});

	const response = await getOpenAI().images.edit(
		{
			model: OPENAI_IMAGE_MODEL,
			image: file,
			prompt: buildImagePrompt(input),
			output_format: "png",
			n: 1,
		},
		{ timeout: IMAGE_TIMEOUT_MS, maxRetries: 0 },
	);

	const base64 = response.data?.[0]?.b64_json;
	if (!base64) throw new Error("OpenAI returned no image");
	const dataUrl = toImageDataUrl({ mimeType: "image/png", base64 });
	// Over 4 MB the review would silently skip it; treat that as a failure instead.
	if (!parseImageDataUrl(dataUrl)) throw new Error("Regenerated image exceeds the size limit");
	return dataUrl;
}
