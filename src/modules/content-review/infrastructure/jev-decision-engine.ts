import "server-only";
import {
	type ContentValue,
	choice,
	type EntryType,
	Image,
	noul,
	type Question,
	type Questions,
	type ResultFor,
	score,
} from "@typesafe-ai/sdk";
import type {
	DecisionAnswer,
	DecisionEngine,
	DecisionQuestion,
	DecisionQuestions,
	DecisionRequest,
	DecisionResult,
} from "../domain/decision";
import { getJev, JEV_IMAGE_HEADERS, JEV_IMAGE_MODEL, JEV_MODEL } from "./jev-client";

/** USD per million input tokens. */
const JEV_PRICE_PER_MTOK = 0.042;

function toJevQuestion(question: DecisionQuestion): Question {
	switch (question.type) {
		case "yes_no":
			return noul(question.instructions);
		case "choice":
			return choice(question.instructions, { ...question.options });
		case "score":
			return score(
				question.instructions,
				question.levels.map((level) => `${level.label}: ${level.description}`),
			);
	}
}

function toJevQuestions(questions: DecisionQuestions): Questions {
	const out: Questions = {};
	for (const [name, question] of Object.entries(questions)) {
		out[name] = toJevQuestion(question);
	}
	return out;
}

function fromJevAnswer(
	name: string,
	question: DecisionQuestion,
	answer: ResultFor<Question> | undefined,
): DecisionAnswer {
	if (!answer || answer.type === "box") {
		throw new Error(`JEV returned no usable answer for question "${name}"`);
	}
	if (question.type === "yes_no" && answer.type === "noul") {
		return { type: "yes_no", probability: answer.noul };
	}
	if (question.type === "choice" && answer.type === "choice") {
		return {
			type: "choice",
			choice: answer.choice,
			confidence: answer.confidence,
			probabilities: { ...answer.probabilities },
		};
	}
	if (question.type === "score" && answer.type === "score") {
		const byLevel: Readonly<Record<number, number>> = answer.probabilities;
		return {
			type: "score",
			score: answer.score,
			confidence: answer.confidence,
			probabilities: question.levels.map((_, index) => byLevel[index] ?? 0),
		};
	}
	throw new Error(`JEV answer type "${answer.type}" does not match question "${name}"`);
}

/**
 * JEV state for a request. With an image, the fields go in an object next to a
 * `screenshot` asset; the SDK uploads the bytes as a multipart part.
 */
function toJevState(request: DecisionRequest): NonNullable<EntryType> {
	const fields = request.input as { [key: string]: ContentValue };
	if (!request.image) {
		return typeof request.input === "string" ? request.input : fields;
	}
	const screenshot = Image.fromBase64(request.image.base64);
	return typeof request.input === "string"
		? { content: request.input, screenshot }
		: { ...fields, screenshot };
}

/** Decision engine backed by TypeSafe JEV (System One). */
export class JevDecisionEngine implements DecisionEngine {
	readonly provider = "jev" as const;

	async decide(request: DecisionRequest): Promise<DecisionResult> {
		const started = performance.now();
		const result = await getJev().systemOne(
			{
				state: toJevState(request),
				questions: toJevQuestions(request.questions),
				model: request.image ? JEV_IMAGE_MODEL : JEV_MODEL,
			},
			// Images are experimental in TypeSafe and need an explicit opt-in per request.
			request.image ? { headers: JEV_IMAGE_HEADERS } : undefined,
		);
		const latencyMs = Math.round(performance.now() - started);

		const answers: Record<string, DecisionAnswer> = {};
		for (const [name, question] of Object.entries(request.questions)) {
			answers[name] = fromJevAnswer(name, question, result.answers[name]);
		}

		const inputTokens = result.usage.input_tokens;
		return {
			answers,
			provider: this.provider,
			model: result.model,
			latencyMs,
			inputTokens,
			costUsd: inputTokens === null ? null : (inputTokens / 1e6) * JEV_PRICE_PER_MTOK,
			usedFallback: false,
		};
	}
}
