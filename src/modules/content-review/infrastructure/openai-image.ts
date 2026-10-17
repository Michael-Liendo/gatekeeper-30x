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

/** Prompt for the image model. Spanish copy, so the redrawn text stays in Spanish. */
export function buildImagePrompt(input: ImageRegenerationInput): string {
	const { brand } = input;
	const colors = listOf(brand.colors);
	const offerings = listOf(brand.offerings);
	const tone = brand.tone.trim();
	return [
		// Role and goal: a real designer fixing a real post, not a new AI illustration.
		`Eres diseñador senior del equipo de ${brand.name}. Corrige esta pieza para redes sociales como lo haría una persona en Figma: es una edición, no una imagen nueva.`,
		"Conserva el formato, el encuadre, la composición, la jerarquía tipográfica y los elementos gráficos que no tengan problemas.",
		colors &&
			`Paleta de la marca: ${colors} (el primero es el principal). Usa colores planos y sólidos de esa paleta.`,
		tone && `La pieza debe sentirse acorde al tono de la marca: ${tone}.`,
		"Acabado natural y profesional, como una pieza publicada por una marca real: tipografía nítida y bien alineada, márgenes generosos, buen contraste y lectura fácil en el celular.",
		"Evita el aspecto de imagen generada por IA: nada de brillos, degradados exagerados, texturas plásticas, efectos 3D, destellos ni elementos decorativos sobrantes.",
		"Reemplaza TODO el texto visible por este texto corregido, en español, copiado exactamente y con tildes correctas:",
		`Título: «${input.title}».`,
		`Texto: «${input.body}».`,
		"Si el texto completo no cabe con buena legibilidad, usa el título y una sola frase clave del texto; nunca inventes texto nuevo ni dejes texto a medias.",
		'Quita de la imagen cualquier promesa de resultados garantizados, cifras sin fuente, urgencia falsa ("últimos cupos", "gana ya"), íconos de dinero o cripto',
		offerings
			? `y cualquier oferta que la marca no vende (solo vende: ${offerings}).`
			: "y cualquier oferta que la marca no vende.",
		input.failedChecks.length > 0 &&
			`Problemas detectados que debes corregir: ${input.failedChecks.join("; ")}.`,
		input.changes.length > 0 && `Cambios ya aplicados al texto: ${input.changes.join(" ")}`,
		"No agregues logotipos inventados, personas, rostros, manos, personajes conocidos ni marcas de terceros.",
	]
		.filter(Boolean)
		.join(" ");
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
