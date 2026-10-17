import "server-only";
import OpenAI from "openai";
import type { Decision, DecisionCreateParams } from "openai/resources/decisions";
import { env } from "@/shared/config/env";
import { toImageDataUrl } from "../domain/content-image";
import type {
	DecisionAnswer,
	DecisionEngine,
	DecisionQuestion,
	DecisionRequest,
	DecisionResult,
	ScoreQuestion,
} from "../domain/decision";

/** USD per million input tokens. */
const OPENAI_DECISIONS_PRICE_PER_MTOK = 0.1;

type OpenAIQuestion = DecisionCreateParams["questions"][number];
type OpenAIAnswer = Decision["answers"][number];

let client: OpenAI | undefined;

/** Created lazily so builds don't need the API key. */
function getOpenAI(): OpenAI {
	client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
	return client;
}

function toOpenAIQuestion(name: string, question: DecisionQuestion): OpenAIQuestion {
	switch (question.type) {
		case "yes_no":
			return { type: "predicate", name, instructions: question.instructions };
		case "choice":
			return {
				type: "choice",
				name,
				instructions: question.instructions,
				choices: Object.entries(question.options).map(([value, description]) => ({
					value,
					description,
				})),
			};
		case "score":
			return {
				type: "score",
				name,
				instructions: question.instructions,
				levels: question.levels.map(({ label, description }) => ({ label, description })),
			};
	}
}

function scoreProbabilities(
	question: ScoreQuestion,
	probabilities: readonly { value: number; label: string; probability: number }[],
): number[] {
	const out = question.levels.map(() => 0);
	for (const entry of probabilities) {
		const byValue =
			Number.isInteger(entry.value) && entry.value >= 0 && entry.value < out.length
				? entry.value
				: -1;
		const index =
			byValue >= 0 ? byValue : question.levels.findIndex((level) => level.label === entry.label);
		if (index >= 0) out[index] = entry.probability;
	}
	return out;
}

function fromOpenAIAnswer(
	name: string,
	question: DecisionQuestion,
	answer: OpenAIAnswer | undefined,
): DecisionAnswer {
	if (!answer) {
		throw new Error(`OpenAI returned no answer for question "${name}"`);
	}
	if (answer.type === "refusal") {
		throw new Error(`OpenAI refused to answer question "${name}"`);
	}
	if (question.type === "yes_no" && answer.type === "predicate") {
		return { type: "yes_no", probability: answer.probability };
	}
	if (question.type === "choice" && answer.type === "choice") {
		const probabilities: Record<string, number> = {};
		for (const entry of answer.probabilities) {
			probabilities[String(entry.value)] = entry.probability;
		}
		return {
			type: "choice",
			choice: String(answer.choice),
			confidence: answer.confidence,
			probabilities,
		};
	}
	if (question.type === "score" && answer.type === "score") {
		return {
			type: "score",
			score: answer.score,
			confidence: answer.confidence,
			probabilities: scoreProbabilities(question, answer.probabilities),
		};
	}
	throw new Error(`OpenAI answer type "${answer.type}" does not match question "${name}"`);
}

/** Text-only input as a string; with an image, one user message with text + image parts. */
function toOpenAIInput(request: DecisionRequest): DecisionCreateParams["input"] {
	const text = typeof request.input === "string" ? request.input : JSON.stringify(request.input);
	if (!request.image) return text;
	return [
		{
			role: "user",
			content: [
				{ type: "input_text", text },
				{ type: "input_image", image_url: toImageDataUrl(request.image) },
			],
		},
	];
}

/** Decision engine backed by the OpenAI Decisions API (`POST /v1/decisions`). */
export class OpenAIDecisionEngine implements DecisionEngine {
	readonly provider = "openai" as const;

	async decide(request: DecisionRequest): Promise<DecisionResult> {
		const started = performance.now();
		const entries = Object.entries(request.questions);

		const response = await getOpenAI().decisions.create({
			model: env.OPENAI_DECISIONS_MODEL,
			input: toOpenAIInput(request),
			questions: entries.map(([name, question]) => toOpenAIQuestion(name, question)),
		});
		const latencyMs = Math.round(performance.now() - started);

		// Answers come back in question order and carry the question name; prefer the name.
		const answers: Record<string, DecisionAnswer> = {};
		entries.forEach(([name, question], index) => {
			const answer =
				response.answers.find((candidate) => candidate.name === name) ?? response.answers[index];
			answers[name] = fromOpenAIAnswer(name, question, answer);
		});

		const inputTokens: number | null = response.usage?.input_tokens ?? null;
		return {
			answers,
			provider: this.provider,
			model: response.model,
			latencyMs,
			inputTokens,
			costUsd: inputTokens === null ? null : (inputTokens / 1e6) * OPENAI_DECISIONS_PRICE_PER_MTOK,
			usedFallback: false,
		};
	}
}
