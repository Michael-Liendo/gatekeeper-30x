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

/** First sentence of the body if it fits on one line; empty otherwise (never cut with "…"). */
export function shortLine(body: string, max = 90): string {
	const first = body.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
	return first.length <= max ? first : "";
}

/** Checks that mean the original visual itself is the problem (spam, off-brand, unsold offer). */
const REDESIGN_CHECKS = /spam|riesgo de marca|no vende|tema "otro"|promesas exageradas/i;

/**
 * Prompt for the image model, short and concrete. Two modes:
 * - retouch: the original visual is fine, so keep it and only fix the text;
 * - redesign: the visual itself is the problem, so compose a new editorial post the way
 *   a strong brand does on Instagram: a real-looking photo (people, places, objects),
 *   a bold headline over it with key words in the brand color, and the brand name small.
 */
export function buildImagePrompt(input: ImageRegenerationInput): string {
	const { brand } = input;
	const line = shortLine(input.body);
	const primary = brand.colors[0];
	const redesign = input.failedChecks.some((check) => REDESIGN_CHECKS.test(check));
	const text = `titular «${input.title}»${line ? ` y, debajo, una sola línea corta: «${line}»` : ""}`;
	const people =
		"Puedes usar personas, ambientes y objetos realistas (equipos trabajando, fundadores en una reunión, oficinas, ciudades de Latinoamérica, escritorios, eventos), siempre personas genéricas que no sean figuras públicas reales ni personajes conocidos.";
	const common = [
		"Calidad de fotografía editorial: luz natural, profundidad de campo, texturas reales; nunca un fondo plano con solo texto, ni clipart, ni aspecto de imagen generada por IA.",
		"Texto en español, escrito exactamente como se indica y con tildes; nada de texto adicional ni párrafos largos.",
		"No uses logos de otras marcas ni marcas de agua.",
	];
	if (redesign) {
		return [
			`Diseña un post de Instagram cuadrado para ${brand.name}, al nivel de una escuela de negocios con mucho estilo.`,
			"Usa la imagen adjunta solo como referencia de tema; no copies sus elementos de spam, sellos, monedas, cohetes ni promesas.",
			`Fondo: una foto realista a sangre completa relacionada con el mensaje, con una viñeta oscura suave para que el texto se lea. ${people}`,
			`Texto sobre la foto: ${text}. Titular grande en sans-serif bold, alineado a la izquierda, con 2 o 3 palabras clave resaltadas${primary ? ` en el color de la marca ${primary}` : " en un color de acento"}.`,
			`Pon el nombre «${brand.name}» pequeño, en texto, abajo a la izquierda, como firma de marca.`,
			...common,
		].join(" ");
	}
	return [
		`Retoca esta pieza real de redes sociales de ${brand.name} como lo haría su diseñador.`,
		"Conserva lo visual del original: la foto o ilustración, la composición, la paleta, el estilo tipográfico, los logos que ya están y el mismo formato.",
		`Cambia solo el texto por: ${text}. Respeta la cantidad de texto del original.`,
		"Quita sellos, insignias o frases de resultados garantizados, dinero rápido o urgencia falsa, si los hay.",
		`Si el original es solo texto sobre un fondo plano, conviértelo en un post con una foto realista de fondo relacionada con el mensaje. ${people}`,
		...common,
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
			// Keep the original's aspect ratio. (sunburst rejects `input_fidelity`; fidelity
			// to the original comes from the prompt.) Medium quality: much faster, still sharp.
			quality: "medium",
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
