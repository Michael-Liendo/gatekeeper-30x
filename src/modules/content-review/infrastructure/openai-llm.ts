import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";
import { env } from "@/shared/config/env";
import { toImageDataUrl } from "../domain/content-image";
import type { DecisionImage } from "../domain/decision";

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
}

const INSTRUCTIONS = [
	"Eres un editor senior de 30X Media.",
	"Recibes una pieza de contenido y la lista de controles editoriales que no superó.",
	"Responde siempre en español neutro.",
	"Propón un título mejorado (suggestedTitle), un resumen de exactamente 3 viñetas (summary)",
	"y una lista de correcciones concretas y accionables, una por cada control fallido (fixes).",
	"Si la pieza incluye una captura, léela como parte del contenido y puedes referirte a ella.",
	"No inventes datos, cifras ni citas que no estén en el texto original o en la captura.",
].join(" ");

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
 * editorial fixes the 30X Media editor can apply. Output is in Spanish.
 */
export async function suggestEditorialFixes(input: EditorialFixesInput): Promise<EditorialFixes> {
	const response = await getOpenAI().responses.parse({
		model: env.OPENAI_LLM_MODEL,
		instructions: INSTRUCTIONS,
		input: toResponsesInput(input),
		text: { format: zodTextFormat(editorialFixesSchema, "editorial_fixes") },
	});

	const parsed = response.output_parsed;
	if (!parsed) {
		throw new Error("OpenAI returned no structured editorial fixes");
	}
	return parsed;
}
