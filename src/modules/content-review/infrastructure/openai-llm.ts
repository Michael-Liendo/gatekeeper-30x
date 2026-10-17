import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/shared/config/env";

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
}

const INSTRUCTIONS = [
	"Eres un editor senior de 30X Media.",
	"Recibes una pieza de contenido y la lista de controles editoriales que no superó.",
	"Responde siempre en español neutro.",
	"Propón un título mejorado (suggestedTitle), un resumen de exactamente 3 viñetas (summary)",
	"y una lista de correcciones concretas y accionables, una por cada control fallido (fixes).",
	"No inventes datos, cifras ni citas que no estén en el texto original.",
].join(" ");

/**
 * "System Two" enrichment: once JEV has flagged problems, ask an LLM for concrete
 * editorial fixes the 30X Media editor can apply. Output is in Spanish.
 */
export async function suggestEditorialFixes(input: EditorialFixesInput): Promise<EditorialFixes> {
	const response = await getOpenAI().responses.parse({
		model: env.OPENAI_LLM_MODEL,
		instructions: INSTRUCTIONS,
		input: JSON.stringify({
			title: input.title,
			body: input.body,
			failedChecks: input.failedChecks,
		}),
		text: { format: zodTextFormat(editorialFixesSchema, "editorial_fixes") },
	});

	const parsed = response.output_parsed;
	if (!parsed) {
		throw new Error("OpenAI returned no structured editorial fixes");
	}
	return parsed;
}
