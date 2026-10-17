import "server-only";
import OpenAI, { toFile } from "openai";
import { env } from "@/shared/config/env";
import type { ImageRegenerationInput } from "../application/regenerate-piece";
import { parseImageDataUrl, toImageDataUrl } from "../domain/content-image";
import { OPENAI_IMAGE_MODEL } from "./openai-models";

/**
 * Image edits are slow; give them their own budget, separate from the text rewrite.
 * Kept under Cloudflare's 100 s proxy limit together with the rewrite and the review.
 */
export const IMAGE_TIMEOUT_MS = 80_000;

let client: OpenAI | undefined;

/** Created lazily so builds don't need the API key. */
function getOpenAI(): OpenAI {
	if (!env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
	return client;
}

/** First sentence of the body, short enough for one line on the image. */
export function shortLine(body: string, max = 90): string {
	const first = body.trim().split(/(?<=[.!?¿¡])\s+/)[0] ?? "";
	return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/**
 * Prompt for the image model: an in-place edit of the real piece, short and concrete
 * (what to keep, the exact text, what to remove). Never a new flat text card: the
 * original photo, illustration, layout, logos and typography style stay.
 */
export function buildImagePrompt(input: ImageRegenerationInput): string {
	const { brand } = input;
	const line = shortLine(input.body);
	return [
		`Edita esta pieza real de redes sociales de ${brand.name} como lo haría su diseñador: es un retoque, no una imagen nueva.`,
		"Conserva todo lo visual del original: la foto o ilustración de fondo, la composición, la paleta, el estilo tipográfico, los logos y elementos que ya están en la imagen y el mismo formato y proporción.",
		"Cambia solo el texto que haga falta y quita solo lo problemático. Si el texto original ya estaba bien, déjalo igual.",
		`Texto nuevo, escrito exactamente así y con tildes: titular «${input.title}»${line ? `; si el original tenía una línea secundaria, usa: «${line}»` : ""}.`,
		"Respeta la cantidad de texto del original: si casi no tenía texto, no agregues párrafos; nunca pongas el cuerpo completo del post en la imagen.",
		"Quita sellos, insignias, íconos o frases de resultados garantizados, dinero rápido, cripto o urgencia falsa, si los hay.",
		"Debe verse como un post real y atractivo de Instagram: con profundidad, textura y la calidad del original. Nunca un fondo plano con solo texto.",
		"No agregues logos nuevos, personas, rostros, personajes conocidos ni marcas de terceros que no estuvieran en el original.",
	].join(" ");
}

/**
 * Redraws a piece's screenshot with the corrected copy and the brand colors.
 * Returns a JPEG `data:` URL that passes `parseImageDataUrl` (so JEV can judge it).
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
			// Best available editor; keep the original's aspect ratio. (sunburst rejects
			// `input_fidelity`; fidelity to the original comes from the prompt.)
			quality: "high",
			size: "auto",
			// JPEG keeps a high-quality result under the 4 MB review limit.
			output_format: "jpeg",
			output_compression: 88,
			n: 1,
		},
		{ timeout: IMAGE_TIMEOUT_MS, maxRetries: 0 },
	);

	const base64 = response.data?.[0]?.b64_json;
	if (!base64) throw new Error("OpenAI returned no image");
	const dataUrl = toImageDataUrl({ mimeType: "image/jpeg", base64 });
	// Over 4 MB the review would silently skip it; treat that as a failure instead.
	if (!parseImageDataUrl(dataUrl)) throw new Error("Regenerated image exceeds the size limit");
	return dataUrl;
}
