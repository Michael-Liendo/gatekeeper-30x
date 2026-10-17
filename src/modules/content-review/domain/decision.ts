/**
 * Provider-agnostic decision contract.
 *
 * The domain asks typed questions about a piece of content and gets typed
 * answers back. Which model answers them (JEV, OpenAI Decisions, ...) is an
 * infrastructure detail behind the `DecisionEngine` port.
 */

/** Yes/no question. Maps to JEV `noul` and OpenAI `predicate`. */
export interface YesNoQuestion {
	type: "yes_no";
	instructions: string;
}

/** Pick one unordered option. Keys are stable ids, values describe when each applies. */
export interface ChoiceQuestion {
	type: "choice";
	instructions: string;
	options: Record<string, string>;
}

/** Place the input on ordered levels, lowest first. */
export interface ScoreQuestion {
	type: "score";
	instructions: string;
	levels: readonly { label: string; description: string }[];
}

export type DecisionQuestion = YesNoQuestion | ChoiceQuestion | ScoreQuestion;

export type DecisionQuestions = Record<string, DecisionQuestion>;

export interface YesNoAnswer {
	type: "yes_no";
	/** Probability (0–1) that the answer is "yes". */
	probability: number;
}

export interface ChoiceAnswer {
	type: "choice";
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
}

export interface ScoreAnswer {
	type: "score";
	/** Probability-weighted level index (0 = lowest level); may fall between levels. */
	score: number;
	confidence: number;
	/** Probability per level index. */
	probabilities: number[];
}

export type DecisionAnswer = YesNoAnswer | ChoiceAnswer | ScoreAnswer;

export type DecisionProvider = "jev" | "openai";

export interface DecisionResult {
	answers: Record<string, DecisionAnswer>;
	provider: DecisionProvider;
	model: string;
	latencyMs: number;
	inputTokens: number | null;
	/** Estimated USD cost of the call (input tokens × provider price). */
	costUsd: number | null;
	/** True when the primary provider failed and a fallback answered. */
	usedFallback: boolean;
}

export type DecisionImageMimeType = "image/png" | "image/jpeg";

/** An image sent alongside the input, as raw base64 (no `data:` prefix). */
export interface DecisionImage {
	mimeType: DecisionImageMimeType;
	base64: string;
}

export interface DecisionRequest {
	/** Text or JSON-serializable state describing the content. */
	input: string | Record<string, unknown>;
	questions: DecisionQuestions;
	/** Optional screenshot of the content; engines send it as an image part. */
	image?: DecisionImage;
}

/** Port implemented by each model provider (see infrastructure/). */
export interface DecisionEngine {
	readonly provider: DecisionProvider;
	decide(request: DecisionRequest): Promise<DecisionResult>;
}
