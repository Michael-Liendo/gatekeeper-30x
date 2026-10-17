import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import type { BrandProfile } from "@/modules/brand/domain/brand-profile";
import { env } from "@/shared/config/env";
import type { RewriteInput, RewriteOutput } from "../application/regenerate-piece";
import { toImageDataUrl } from "../domain/content-image";
import type { DecisionImage } from "../domain/decision";
import { OPENAI_LLM_MODEL } from "./openai-models";

let client: OpenAI | undefined;

/** Created lazily so builds don't need the API key. */
function getOpenAI(): OpenAI {
	if (!env.OPENAI_API_KEY) {
		throw new Error("OPENAI_API_KEY is not configured");
	}
	client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
	return client;
}

const editorialFixesSchema = z.object({
	suggestedTitle: z.string(),
	summary: z.array(z.string()).length(3),
	fixes: z.array(z.string()),
});

export type EditorialFixes = z.infer<typeof editorialFixesSchema>;

export interface EditorialFixesInput {
	title: string;
	body: string;
	/** Human-readable descriptions of the checks the content failed. */
	failedChecks: string[];
	/** Screenshot of the piece, when it was submitted as an image. */
	image?: DecisionImage;
	/** The brand whose voice and offer the suggestions must respect. */
	brand: BrandProfile;
}

function listOf(items: readonly string[]): string {
	return items
		.map((item) => item.trim())
		.filter(Boolean)
		.join("; ");
}

/** System instructions for the fixer, with the brand's voice and offer. Spanish (goes to the model). */
export function buildFixerInstructions(brand: BrandProfile): string {
	const offerings = listOf(brand.offerings);
	const forbidden = listOf(brand.forbidden);
	return [
		`Eres un editor senior del equipo de contenido de ${brand.name}.`,
		brand.description.trim() && `Sobre la marca: ${brand.description.trim()}`,
		brand.audience.trim() && `Audiencia: ${brand.audience.trim()}.`,
		brand.tone.trim() && `Tono de la marca: ${brand.tone.trim()}. Las sugerencias deben sonar así.`,
		offerings &&
			`${brand.name} vende solo: ${offerings}. No sugieras ofrecer nada fuera de esa lista.`,
		forbidden && `Temas que ${brand.name} nunca publica: ${forbidden}. No los sugieras.`,
		"Recibes una pieza de contenido y la lista de controles editoriales que no superó.",
		"Responde siempre en español neutro.",
		"Propón un título mejorado (suggestedTitle), un resumen de exactamente 3 viñetas (summary)",
		"y una lista de correcciones concretas y accionables, una por cada control fallido (fixes).",
		"Si la pieza incluye una captura, léela como parte del contenido y puedes referirte a ella.",
		"No inventes datos, cifras ni citas que no estén en el texto original o en la captura.",
	]
		.filter(Boolean)
		.join(" ");
}

/** Text-only input as a JSON string; with a screenshot, one user message with both parts. */
function toResponsesInput(input: EditorialFixesInput): string | ResponseInput {
	const text = JSON.stringify({
		title: input.title,
		body: input.body,
		failedChecks: input.failedChecks,
	});
	if (!input.image) return text;
	return [
		{
			role: "user",
			content: [
				{ type: "input_text", text },
				{ type: "input_image", image_url: toImageDataUrl(input.image), detail: "auto" },
			],
		},
	];
}

/**
 * "System Two" enrichment: once JEV has flagged problems, ask an LLM for concrete
 * editorial fixes the brand's editor can apply, in the brand's voice. Output is in Spanish.
 */
export async function suggestEditorialFixes(input: EditorialFixesInput): Promise<EditorialFixes> {
	const response = await getOpenAI().responses.parse({
		model: OPENAI_LLM_MODEL,
		instructions: buildFixerInstructions(input.brand),
		input: toResponsesInput(input),
		text: { format: zodTextFormat(editorialFixesSchema, "editorial_fixes") },
	});

	const parsed = response.output_parsed;
	if (!parsed) {
		throw new Error("OpenAI returned no structured editorial fixes");
	}
	return parsed;
}

const rewriteSchema = z.object({
	title: z.string(),
	body: z.string(),
	changes: z.array(z.string()),
});

/** System instructions for "Regenerar con IA", with the brand's voice and offer. Spanish. */
export function buildRewriterInstructions(brand: BrandProfile): string {
	const offerings = listOf(brand.offerings);
	const forbidden = listOf(brand.forbidden);
	return [
		`Eres un editor senior del equipo de contenido de ${brand.name}. Reescribes piezas para que pasen la línea editorial de la marca.`,
		brand.description.trim() && `Sobre la marca: ${brand.description.trim()}`,
		brand.audience.trim() && `Audiencia: ${brand.audience.trim()}.`,
		brand.tone.trim() &&
			`Tono de la marca: ${brand.tone.trim()}. La pieza reescrita debe sonar así.`,
		offerings &&
			`${brand.name} vende solo: ${offerings}. Menciona o promociona solo eso; quita cualquier oferta fuera de esa lista.`,
		forbidden && `Temas que ${brand.name} nunca publica: ${forbidden}. Evítalos por completo.`,
		"Recibes la pieza (título, texto, formato y canal), los controles editoriales que no superó (failedChecks) y un resumen de las respuestas del revisor (answersSummary).",
		"Reglas:",
		"1) Conserva el propósito de la pieza (por ejemplo, si anuncia un evento, sigue anunciando ese evento), la idea del autor, el formato y una extensión parecida a la original.",
		"2) Conserva TODOS los datos concretos del original: fechas, horarios, lugares, nombres de organizadores y aliados, enlaces, premios y llamados a la acción. Solo quítalos si son exactamente el problema señalado.",
		"3) Corrige SOLO lo señalado en failedChecks; no reescribas lo que ya estaba bien. Si el problema es que no encaja con la marca, ajusta el ángulo y las palabras para conectarlo con la marca; no cambies el tema por otro.",
		"4) No inventes datos, cifras, clientes, citas ni resultados. Si una afirmación no tenía fuente, quítala o reemplaza el dato por el marcador [FUENTE].",
		"5) No prometas resultados garantizados.",
		"6) Si la pieza llega solo como captura (texto vacío), usa el texto visible en la imagen como fuente.",
		"Responde en español neutro: title (título reescrito), body (texto completo reescrito, listo para publicar, sin comentarios)",
		"y changes (de 2 a 5 frases cortas que expliquen qué cambiaste y por qué).",
	]
		.filter(Boolean)
		.join(" ");
}

/**
 * "Regenerar con IA": rewrites a piece in the brand's voice fixing only what JEV
 * flagged. Output is in Spanish; never invents facts (uses "[FUENTE]" placeholders).
 */
export async function rewritePiece(input: RewriteInput): Promise<RewriteOutput> {
	const text = JSON.stringify({
		title: input.title,
		body: input.body,
		format: input.format,
		channel: input.channel,
		failedChecks: input.failedChecks,
		answersSummary: input.answersSummary,
	});
	const content: ResponseInput | string = input.imageDataUrl
		? [
				{
					role: "user",
					content: [
						{ type: "input_text", text },
						{ type: "input_image", image_url: input.imageDataUrl, detail: "auto" },
					],
				},
			]
		: text;

	const response = await getOpenAI().responses.parse({
		model: OPENAI_LLM_MODEL,
		instructions: buildRewriterInstructions(input.brand),
		input: content,
		text: { format: zodTextFormat(rewriteSchema, "piece_rewrite") },
	});

	const parsed = response.output_parsed;
	if (!parsed) {
		throw new Error("OpenAI returned no structured rewrite");
	}
	return { title: parsed.title, body: parsed.body, changes: parsed.changes.slice(0, 5) };
}
