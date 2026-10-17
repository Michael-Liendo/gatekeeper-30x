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

function listOf(items: readonly string[]): string {
	return items
		.map((item) => item.trim())
		.filter(Boolean)
		.join(", ");
}

/** First sentence of the body, short enough for one line on the image. */
export function shortLine(body: string, max = 90): string {
	const first = body.trim().split(/(?<=[.!?¿¡])\s+/)[0] ?? "";
	return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/**
 * Prompt for the image model: short and concrete (format, exact text overlay, style, what
 * to remove), the way it works best for image models. Quality pieces keep their design and
 * only change the text; spammy or off-brand pieces are restyled with the brand palette.
 */
export function buildImagePrompt(input: ImageRegenerationInput): string {
	const { brand } = input;
	const colors = listOf(brand.colors);
	const restyle = input.failedChecks.some((check) => /spam|riesgo de marca|no vende/i.test(check));
	const line = shortLine(input.body);
	return [
		`Edita esta imagen de redes sociales de ${brand.name}. Mismo formato y proporción.`,
		restyle
			? `Rediséñala como una pieza editorial limpia de la marca: fondo de color plano ${colors ? `de su paleta (${colors})` : "sobrio"}, tipografía sans-serif grande y negra, mucho espacio en blanco.`
			: "Conserva exactamente el diseño: los mismos colores de fondo, la misma tipografía, los mismos elementos gráficos y la misma posición de cada elemento. Solo cambia el texto.",
		`Texto de la imagen, escrito exactamente así y con tildes: titular «${input.title}»${line ? `; una línea debajo: «${line}»` : ""}. No agregues ningún otro texto.`,
		"Quita sellos, insignias, íconos o frases de resultados garantizados, dinero rápido, cripto o urgencia falsa.",
		"Estilo: natural y profesional, como un post real de una marca; sin brillos, degradados, efectos 3D ni aspecto de imagen generada por IA.",
		"NO incluyas logos nuevos, personas, rostros, personajes conocidos ni marcas de terceros.",
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
